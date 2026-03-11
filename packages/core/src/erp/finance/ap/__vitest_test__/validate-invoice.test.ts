/**
 * Unit tests for validateInvoice — duplicate detection + 3-way match orchestrator.
 *
 * Tests cover:
 * - Invoice not found → returns without holds
 * - No PO reference → only duplicate check
 * - Duplicate detected → DUPLICATE hold created
 * - No duplicates, no PO → 0 holds
 * - PO not found → matchStatus = PO_NOT_FOUND
 * - No receipt → NEEDS_RECEIPT hold created
 * - 3-way match pass (MATCHED) → 0 additional holds
 * - 3-way match QUANTITY_MISMATCH → QUANTITY_VARIANCE hold
 * - 3-way match OVER_TOLERANCE → PRICE_VARIANCE hold
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId, PrincipalId, CorrelationId, InvoiceId } from "@afenda/contracts";

// ── Mock DB ───────────────────────────────────────────────────────────────────

const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn();
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));
const { mockCreateHold } = vi.hoisted(() => ({
  mockCreateHold: vi.fn(),
}));

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
} as any;

vi.mock("@afenda/db", () => ({
  invoice: { id: "id", orgId: "org_id", supplierId: "supplier_id", status: "status",
    invoiceNumber: "invoice_number", amountMinor: "amount_minor", currencyCode: "currency_code",
    poReference: "po_reference", createdAt: "created_at" },
  purchaseOrder: { id: "id", orgId: "org_id", amountMinor: "amount_minor",
    currencyCode: "currency_code", poNumber: "po_number" },
  receipt: { id: "id", orgId: "org_id", amountMinor: "amount_minor", currencyCode: "currency_code",
    purchaseOrderId: "purchase_order_id", status: "status" },
  matchTolerance: { orgId: "org_id", scope: "scope", isActive: "is_active",
    tolerancePercent: "tolerance_percent" },
  apHold: { id: "id", orgId: "org_id", invoiceId: "invoice_id", status: "status" },
  outboxEvent: {},
  auditLog: {},
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn(() => ({})),
    and: vi.fn(() => ({})),
    inArray: vi.fn(() => ({})),
    sql: Object.assign(vi.fn(() => ({})), { raw: vi.fn(() => ({})) }),
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => fn(mockDb)),
}));

vi.mock("../hold.service", () => ({
  createHold: mockCreateHold,
}));

import { validateInvoice } from "../validate-invoice";

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const INVOICE_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd" as InvoiceId;
const SUPPLIER_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const PO_ID = "pppppppp-pppp-pppp-pppp-pppppppppppp";
const RECEIPT_ID = "rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr";
const HOLD_ID = "hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh";

const CTX = { activeContext: { orgId: ORG_ID } };
const POLICY_CTX = { principalId: null as PrincipalId | null };

// Invoice row returned by first select
const BASE_INVOICE_ROW = {
  id: INVOICE_ID,
  supplierId: SUPPLIER_ID,
  invoiceNumber: "INV-001",
  amountMinor: 10000n,
  currencyCode: "USD",
  poReference: null as string | null,
  createdAt: new Date("2026-03-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: select().from().where() returns empty (no results)
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelectWhere.mockReturnValue({ where: mockSelectWhere, limit: mockSelectLimit });
  mockSelectLimit.mockResolvedValue([]);
  mockSelectWhere.mockResolvedValue([]);
  mockInsertReturning.mockResolvedValue([{ id: HOLD_ID }]);
  mockCreateHold.mockResolvedValue({ ok: true, data: { id: HOLD_ID } });
});

// ── Invoice not found ────────────────────────────────────────────────────────

describe("validateInvoice — invoice not found", () => {
  it("returns 0 holds when invoice not found in org", async () => {
    // First select (invoice lookup) returns nothing
    mockSelectWhere
      .mockResolvedValueOnce([]) // invoice not found
      .mockResolvedValue([]); // no-op for remaining selects

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.holdsCreated).toBe(0);
    expect(result.duplicateGroupSize).toBe(0);
    expect(result.matchStatus).toBeNull();
  });
});

// ── No PO reference ──────────────────────────────────────────────────────────

describe("validateInvoice — no PO reference, no duplicates", () => {
  it("returns 0 holds when invoice has no PO and is not a duplicate", async () => {
    mockSelectWhere
      .mockResolvedValueOnce([BASE_INVOICE_ROW]) // invoice found
      .mockResolvedValueOnce([{ id: INVOICE_ID, supplierId: SUPPLIER_ID,
        invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: new Date("2026-03-01") }]); // only this invoice (no dups)

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.holdsCreated).toBe(0);
    expect(result.duplicateGroupSize).toBe(0);
    expect(result.matchStatus).toBeNull();
  });
});

// ── Duplicate detection ──────────────────────────────────────────────────────

describe("validateInvoice — duplicate hold", () => {
  it("creates DUPLICATE hold when 2 invoices share fingerprint", async () => {
    const sameDate = new Date("2026-03-01");
    mockSelectWhere
      .mockResolvedValueOnce([BASE_INVOICE_ROW]) // invoice found
      .mockResolvedValueOnce([ // supplier invoices — 2 with same fingerprint
        { id: INVOICE_ID, supplierId: SUPPLIER_ID, invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: sameDate },
        { id: "dup-222", supplierId: SUPPLIER_ID, invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: sameDate },
      ]);

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.holdsCreated).toBe(1);
    expect(result.duplicateGroupSize).toBe(2);
    expect(mockCreateHold).toHaveBeenCalledWith(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      expect.objectContaining({
        invoiceId: INVOICE_ID,
        holdType: "DUPLICATE",
      }),
    );
  });

  it("does not create DUPLICATE hold when invoice is unique", async () => {
    mockSelectWhere
      .mockResolvedValueOnce([BASE_INVOICE_ROW])
      .mockResolvedValueOnce([
        { id: INVOICE_ID, supplierId: SUPPLIER_ID, invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: new Date("2026-03-01") },
      ]); // only this one

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.holdsCreated).toBe(0);
    expect(result.duplicateGroupSize).toBe(0);
  });
});

// ── PO reference flows ───────────────────────────────────────────────────────

describe("validateInvoice — PO reference flows", () => {
  const INVOICE_WITH_PO = { ...BASE_INVOICE_ROW, poReference: "PO-2026-001" };

  it("sets matchStatus = PO_NOT_FOUND when PO does not exist", async () => {
    mockSelectWhere
      .mockResolvedValueOnce([INVOICE_WITH_PO]) // invoice found
      .mockResolvedValueOnce([{ id: INVOICE_ID, supplierId: SUPPLIER_ID,
        invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: new Date("2026-03-01") }]) // no dups
      .mockResolvedValueOnce([]) // PO not found
      .mockResolvedValue([]);

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.matchStatus).toBe("PO_NOT_FOUND");
    expect(result.holdsCreated).toBe(0);
  });

  it("creates NEEDS_RECEIPT hold when no receipt found for PO", async () => {
    // Sequence of mockSelectWhere calls:
    // 1. invoice lookup (no .limit()) → INVOICE_WITH_PO
    // 2. supplier invoices for dedup (no .limit()) → 1 item (no dup)
    // 3. PO lookup (no .limit()) → PO found
    // 4. receipt lookup (HAS .limit()) → { limit: fn }
    // 5. createHold's invoice check (no .limit()) → invoice found
    mockSelectWhere
      .mockResolvedValueOnce([INVOICE_WITH_PO]) // call 1: invoice
      .mockResolvedValueOnce([{ id: INVOICE_ID, supplierId: SUPPLIER_ID,
        invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: new Date("2026-03-01") }]) // call 2: no dups
      .mockResolvedValueOnce([{ id: PO_ID, amountMinor: 10000n, currencyCode: "USD" }]) // call 3: PO found
      .mockReturnValueOnce({ limit: mockSelectLimit }); // call 4: receipt (uses .limit())

    mockSelectLimit.mockResolvedValue([]); // receipt not found

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.matchStatus).toBe("NEEDS_RECEIPT");
    expect(result.holdsCreated).toBe(1);
    expect(mockCreateHold).toHaveBeenCalledWith(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      expect.objectContaining({
        invoiceId: INVOICE_ID,
        holdType: "NEEDS_RECEIPT",
      }),
    );
  });

  it("creates both DUPLICATE and PRICE_VARIANCE holds when duplicate and over tolerance", async () => {
    const sameDate = new Date("2026-03-01");
    mockSelectWhere
      .mockResolvedValueOnce([{ ...INVOICE_WITH_PO, amountMinor: 10200n }])
      .mockResolvedValueOnce([
        { id: INVOICE_ID, supplierId: SUPPLIER_ID, invoiceNumber: "INV-001", amountMinor: 10200n, createdAt: sameDate },
        { id: "dup-222", supplierId: SUPPLIER_ID, invoiceNumber: "INV-001", amountMinor: 10200n, createdAt: sameDate },
      ])
      .mockResolvedValueOnce([{ id: PO_ID, amountMinor: 10000n, currencyCode: "USD" }])
      .mockReturnValueOnce({ limit: mockSelectLimit })
      .mockReturnValueOnce({ limit: mockSelectLimit });

    mockSelectLimit
      .mockResolvedValueOnce([{ id: RECEIPT_ID, amountMinor: 10000n, currencyCode: "USD" }])
      .mockResolvedValueOnce([{ tolerancePercent: "1.0" }]);

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.holdsCreated).toBe(2);
    expect(result.duplicateGroupSize).toBe(2);
    expect(result.matchStatus).toBe("OVER_TOLERANCE");
    expect(mockCreateHold).toHaveBeenNthCalledWith(
      1,
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      expect.objectContaining({ holdType: "DUPLICATE" }),
    );
    expect(mockCreateHold).toHaveBeenNthCalledWith(
      2,
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      expect.objectContaining({ holdType: "PRICE_VARIANCE" }),
    );
  });

  it("does not create a match hold when invoice variance is exactly on the tolerance boundary", async () => {
    mockSelectWhere
      .mockResolvedValueOnce([{ ...INVOICE_WITH_PO, amountMinor: 10100n }])
      .mockResolvedValueOnce([{ id: INVOICE_ID, supplierId: SUPPLIER_ID,
        invoiceNumber: "INV-001", amountMinor: 10100n, createdAt: new Date("2026-03-01") }])
      .mockResolvedValueOnce([{ id: PO_ID, amountMinor: 10000n, currencyCode: "USD" }])
      .mockReturnValueOnce({ limit: mockSelectLimit })
      .mockReturnValueOnce({ limit: mockSelectLimit });

    mockSelectLimit
      .mockResolvedValueOnce([{ id: RECEIPT_ID, amountMinor: 10000n, currencyCode: "USD" }])
      .mockResolvedValueOnce([{ tolerancePercent: "1.0" }]);

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.holdsCreated).toBe(0);
    expect(result.matchStatus).toBe("WITHIN_TOLERANCE");
    expect(mockCreateHold).not.toHaveBeenCalled();
  });

  it("creates QUANTITY_VARIANCE hold when PO and receipt amounts differ", async () => {
    mockSelectWhere
      .mockResolvedValueOnce([{ ...INVOICE_WITH_PO, amountMinor: 10000n }])
      .mockResolvedValueOnce([{ id: INVOICE_ID, supplierId: SUPPLIER_ID,
        invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: new Date("2026-03-01") }])
      .mockResolvedValueOnce([{ id: PO_ID, amountMinor: 10000n, currencyCode: "USD" }])
      .mockReturnValueOnce({ limit: mockSelectLimit })
      .mockReturnValueOnce({ limit: mockSelectLimit });

    mockSelectLimit
      .mockResolvedValueOnce([{ id: RECEIPT_ID, amountMinor: 9500n, currencyCode: "USD" }])
      .mockResolvedValueOnce([{ tolerancePercent: "1.0" }]);

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.holdsCreated).toBe(1);
    expect(result.matchStatus).toBe("QUANTITY_MISMATCH");
    expect(mockCreateHold).toHaveBeenCalledWith(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      expect.objectContaining({ holdType: "QUANTITY_VARIANCE" }),
    );
  });

  it("does not create a hold when PO, receipt, and invoice match exactly", async () => {
    mockSelectWhere
      .mockResolvedValueOnce([{ ...INVOICE_WITH_PO, amountMinor: 10000n }])
      .mockResolvedValueOnce([{ id: INVOICE_ID, supplierId: SUPPLIER_ID,
        invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: new Date("2026-03-01") }])
      .mockResolvedValueOnce([{ id: PO_ID, amountMinor: 10000n, currencyCode: "USD" }])
      .mockReturnValueOnce({ limit: mockSelectLimit })
      .mockReturnValueOnce({ limit: mockSelectLimit });

    mockSelectLimit
      .mockResolvedValueOnce([{ id: RECEIPT_ID, amountMinor: 10000n, currencyCode: "USD" }])
      .mockResolvedValueOnce([{ tolerancePercent: "1.0" }]);

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.holdsCreated).toBe(0);
    expect(result.matchStatus).toBe("MATCHED");
    expect(mockCreateHold).not.toHaveBeenCalled();
  });

  it("creates both DUPLICATE and NEEDS_RECEIPT holds when duplicate and PO has no receipt", async () => {
    const sameDate = new Date("2026-03-01");
    mockSelectWhere
      .mockResolvedValueOnce([{ ...INVOICE_WITH_PO, amountMinor: 10000n }])
      .mockResolvedValueOnce([
        { id: INVOICE_ID, supplierId: SUPPLIER_ID, invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: sameDate },
        { id: "dup-222", supplierId: SUPPLIER_ID, invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: sameDate },
      ])
      .mockResolvedValueOnce([{ id: PO_ID, amountMinor: 10000n, currencyCode: "USD" }])
      .mockReturnValueOnce({ limit: mockSelectLimit }); // receipt lookup

    mockSelectLimit.mockResolvedValueOnce([]); // no receipt found

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.holdsCreated).toBe(2);
    expect(result.duplicateGroupSize).toBe(2);
    expect(result.matchStatus).toBe("NEEDS_RECEIPT");
    expect(mockCreateHold).toHaveBeenNthCalledWith(
      1,
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      expect.objectContaining({ holdType: "DUPLICATE" }),
    );
    expect(mockCreateHold).toHaveBeenNthCalledWith(
      2,
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      expect.objectContaining({ holdType: "NEEDS_RECEIPT" }),
    );
  });

  it("creates both DUPLICATE and QUANTITY_VARIANCE holds when duplicate and receipt amount differs", async () => {
    const sameDate = new Date("2026-03-01");
    mockSelectWhere
      .mockResolvedValueOnce([{ ...INVOICE_WITH_PO, amountMinor: 10000n }])
      .mockResolvedValueOnce([
        { id: INVOICE_ID, supplierId: SUPPLIER_ID, invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: sameDate },
        { id: "dup-333", supplierId: SUPPLIER_ID, invoiceNumber: "INV-001", amountMinor: 10000n, createdAt: sameDate },
      ])
      .mockResolvedValueOnce([{ id: PO_ID, amountMinor: 10000n, currencyCode: "USD" }])
      .mockReturnValueOnce({ limit: mockSelectLimit })
      .mockReturnValueOnce({ limit: mockSelectLimit });

    mockSelectLimit
      .mockResolvedValueOnce([{ id: RECEIPT_ID, amountMinor: 8000n, currencyCode: "USD" }]) // receipt differs
      .mockResolvedValueOnce([{ tolerancePercent: "1.0" }]);

    const result = await validateInvoice(mockDb, CTX, POLICY_CTX, CORRELATION_ID, INVOICE_ID);

    expect(result.holdsCreated).toBe(2);
    expect(result.duplicateGroupSize).toBe(2);
    expect(result.matchStatus).toBe("QUANTITY_MISMATCH");
    expect(mockCreateHold).toHaveBeenNthCalledWith(
      1,
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      expect.objectContaining({ holdType: "DUPLICATE" }),
    );
    expect(mockCreateHold).toHaveBeenNthCalledWith(
      2,
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      expect.objectContaining({ holdType: "QUANTITY_VARIANCE" }),
    );
  });
});
