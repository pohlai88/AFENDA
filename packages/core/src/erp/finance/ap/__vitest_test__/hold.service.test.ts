/**
 * Unit tests for hold service — createHold, releaseHold.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId, PrincipalId, CorrelationId, InvoiceId, HoldId } from "@afenda/contracts";

// ── Mock DB setup ─────────────────────────────────────────────────────────────

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn();
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
} as any;

vi.mock("@afenda/db", () => ({
  apHold: { id: "id", orgId: "org_id", invoiceId: "invoice_id", status: "status" },
  invoice: { id: "id", orgId: "org_id" },
  outboxEvent: {},
  auditLog: {},
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, _val: unknown) => ({})),
    and: vi.fn((...args: unknown[]) => ({})),
    sql: Object.assign(vi.fn(() => ({})), { raw: vi.fn(() => ({})) }),
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => fn(mockDb)),
}));

import { createHold, releaseHold } from "../hold.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const PRINCIPAL_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const INVOICE_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd" as InvoiceId;
const HOLD_ID = "hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh" as HoldId;

const CTX = { activeContext: { orgId: ORG_ID } };
const POLICY_CTX = { principalId: PRINCIPAL_A };

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectLimit.mockResolvedValue([]);
});

// ── createHold ────────────────────────────────────────────────────────────────

describe("createHold", () => {
  it("returns ok with hold id when invoice exists", async () => {
    // First select (invoice lookup) returns the invoice
    mockSelectWhere.mockResolvedValueOnce([{ id: INVOICE_ID }]);
    mockInsertReturning.mockResolvedValue([{ id: HOLD_ID }]);

    const result = await createHold(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      invoiceId: INVOICE_ID,
      holdType: "DUPLICATE",
      holdReason: "Duplicate detected",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(HOLD_ID);
    }

    const insertedRows = mockInsertValues.mock.calls.map((call) => call[0]);
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "AP.HOLD_CREATED",
          payload: expect.objectContaining({
            holdId: HOLD_ID,
            invoiceId: INVOICE_ID,
            holdType: "DUPLICATE",
            holdReason: "Duplicate detected",
          }),
        }),
      ]),
    );
  });

  it("returns AP_INVOICE_NOT_FOUND when invoice does not exist", async () => {
    mockSelectWhere.mockResolvedValue([]); // invoice not found

    const result = await createHold(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      invoiceId: INVOICE_ID,
      holdType: "MANUAL",
      holdReason: "Manual hold",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_INVOICE_NOT_FOUND");
    }
  });

  it("creates hold with correct holdType", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: INVOICE_ID }]);
    mockInsertReturning.mockResolvedValue([{ id: HOLD_ID }]);

    await createHold(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      invoiceId: INVOICE_ID,
      holdType: "PRICE_VARIANCE",
      holdReason: "Price mismatch",
    });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ holdType: "PRICE_VARIANCE" })
    );
  });

  it("creates hold with active status", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: INVOICE_ID }]);
    mockInsertReturning.mockResolvedValue([{ id: HOLD_ID }]);

    await createHold(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      invoiceId: INVOICE_ID,
      holdType: "NEEDS_RECEIPT",
      holdReason: "No receipt",
    });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" })
    );
  });
});

// ── releaseHold ───────────────────────────────────────────────────────────────

describe("releaseHold", () => {
  it("returns ok when hold is active and found", async () => {
    mockSelectWhere.mockResolvedValue([
      { id: HOLD_ID, status: "active", invoiceId: INVOICE_ID },
    ]);
    mockUpdateReturning.mockResolvedValue([{ id: HOLD_ID }]);

    const result = await releaseHold(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      holdId: HOLD_ID,
      releaseReason: "Resolved",
    });

    expect(result.ok).toBe(true);

    const insertedRows = mockInsertValues.mock.calls.map((call) => call[0]);
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "AP.HOLD_RELEASED",
          payload: expect.objectContaining({
            holdId: HOLD_ID,
            invoiceId: INVOICE_ID,
            releaseReason: "Resolved",
            releasedBy: PRINCIPAL_A,
          }),
        }),
      ]),
    );
  });

  it("returns AP_HOLD_NOT_FOUND when hold does not exist", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await releaseHold(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      holdId: HOLD_ID,
      releaseReason: "Resolved",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_HOLD_NOT_FOUND");
    }
  });

  it("returns AP_HOLD_ALREADY_RELEASED when hold is already released", async () => {
    mockSelectWhere.mockResolvedValue([
      { id: HOLD_ID, status: "released", invoiceId: INVOICE_ID },
    ]);

    const result = await releaseHold(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      holdId: HOLD_ID,
      releaseReason: "Resolved",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_HOLD_ALREADY_RELEASED");
    }
  });
});
