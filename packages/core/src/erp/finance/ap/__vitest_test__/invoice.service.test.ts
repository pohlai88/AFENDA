/**
 * Unit tests for invoice lifecycle service.
 *
 * Uses vi.mock("@afenda/db") to mock DB operations.
 * Tests cover: submit, approve, reject, void — happy paths and guards.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId, PrincipalId, CorrelationId, InvoiceId, SupplierId } from "@afenda/contracts";
import { Permissions } from "@afenda/contracts";
import type { PolicyContext } from "../../sod.js";
import type { OrgScopedContext } from "../../../../kernel/governance/audit/audit.js";

// ── Mock setup ───────────────────────────────────────────────────────────────

// Mock data stores
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockSelectFrom = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn();
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockTransaction = vi.fn();

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
  transaction: mockTransaction,
} as any;

// Mock @afenda/db tables
vi.mock("@afenda/db", () => ({
  invoice: {
    id: "id",
    orgId: "org_id",
    supplierId: "supplier_id",
    status: "status",
    submittedByPrincipalId: "submitted_by_principal_id",
  },
  invoiceStatusHistory: {},
  outboxEvent: {},
  supplier: { id: "id", orgId: "org_id" },
  auditLog: {},
  sequence: {},
  apHold: { id: "id", orgId: "org_id", invoiceId: "invoice_id", status: "status" },
}));

// Mock audit service — withAudit executes the callback directly
vi.mock("../../../../kernel/governance/audit/audit.js", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => {
    return fn(mockDb);
  }),
  writeAuditLog: vi.fn(),
}));

// Mock numbering service
vi.mock("../../../../kernel/execution/numbering/numbering.js", () => ({
  nextNumber: vi.fn(async () => "INV-2026-0001"),
}));

import { submitInvoice, approveInvoice, rejectInvoice, voidInvoice } from "../invoice.service.js";

// ── Test constants ───────────────────────────────────────────────────────────

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const PRINCIPAL_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" as PrincipalId;
const PRINCIPAL_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const INVOICE_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd" as InvoiceId;
const SUPPLIER_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee" as SupplierId;

const CTX: OrgScopedContext = { activeContext: { orgId: ORG_ID } };

function makePolicyCtx(
  overrides: Partial<PolicyContext> & { permissions?: string[] } = {},
): PolicyContext {
  const { permissions, ...rest } = overrides as any;
  return {
    principalId: PRINCIPAL_A,
    permissionsSet: new Set(
      permissions ?? [Permissions.apInvoiceSubmit, Permissions.apInvoiceApprove],
    ),
    ...rest,
  };
}

// ── Reset mocks ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Default chains
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
  mockUpdateReturning.mockResolvedValue([{ id: INVOICE_ID }]);
  mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
  mockTransaction.mockImplementation(async (fn: any) => fn(mockDb));
});

// ── submitInvoice ────────────────────────────────────────────────────────────

describe("submitInvoice", () => {
  it("returns ok with invoice id and number on success", async () => {
    // Supplier exists
    mockSelectWhere.mockResolvedValueOnce([{ id: SUPPLIER_ID }]);
    // Insert returns row
    mockInsertReturning.mockResolvedValue([{ id: INVOICE_ID }]);
    // Status history insert
    mockInsertValues.mockReturnValueOnce({ returning: mockInsertReturning });
    // Outbox insert
    mockInsertValues.mockReturnValueOnce({ returning: vi.fn() });

    const result = await submitInvoice(mockDb, CTX, makePolicyCtx(), CORRELATION_ID, {
      supplierId: SUPPLIER_ID,
      amountMinor: 10000n,
      currencyCode: "USD",
      idempotencyKey: "idem-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.invoiceNumber).toBe("INV-2026-0001");
    }
  });

  it("returns error when supplier not found", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);

    const result = await submitInvoice(mockDb, CTX, makePolicyCtx(), CORRELATION_ID, {
      supplierId: SUPPLIER_ID,
      amountMinor: 10000n,
      currencyCode: "USD",
      idempotencyKey: "idem-2",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SUP_SUPPLIER_NOT_FOUND");
    }
  });
});

// ── approveInvoice ───────────────────────────────────────────────────────────

describe("approveInvoice", () => {
  it("returns ok when principal has permission and is not the submitter", async () => {
    // Invoice exists in submitted status
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INVOICE_ID,
        status: "submitted",
        submittedByPrincipalId: PRINCIPAL_A,
      },
    ]);
    // No active holds (hasActiveHolds uses .where().limit(1))
    mockSelectWhere.mockReturnValueOnce({
      limit: vi.fn().mockResolvedValue([]),
    });

    const pCtx = makePolicyCtx({
      principalId: PRINCIPAL_B,
      permissions: [Permissions.apInvoiceApprove],
    });

    const result = await approveInvoice(
      mockDb,
      CTX,
      pCtx,
      CORRELATION_ID,
      INVOICE_ID,
      "Looks good",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(INVOICE_ID);
    }
  });

  it("returns AP_INVOICE_NOT_FOUND when invoice does not exist", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);

    const result = await approveInvoice(mockDb, CTX, makePolicyCtx(), CORRELATION_ID, INVOICE_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_INVOICE_NOT_FOUND");
    }
  });

  it("returns AP_INVOICE_ALREADY_APPROVED when status is approved", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INVOICE_ID,
        status: "approved",
        submittedByPrincipalId: PRINCIPAL_A,
      },
    ]);

    const pCtx = makePolicyCtx({
      principalId: PRINCIPAL_B,
      permissions: [Permissions.apInvoiceApprove],
    });

    const result = await approveInvoice(mockDb, CTX, pCtx, CORRELATION_ID, INVOICE_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_INVOICE_ALREADY_APPROVED");
    }
  });

  it("returns INVALID_STATUS_TRANSITION when status is voided", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INVOICE_ID,
        status: "voided",
        submittedByPrincipalId: PRINCIPAL_A,
      },
    ]);

    const pCtx = makePolicyCtx({
      principalId: PRINCIPAL_B,
      permissions: [Permissions.apInvoiceApprove],
    });

    const result = await approveInvoice(mockDb, CTX, pCtx, CORRELATION_ID, INVOICE_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_INVOICE_INVALID_STATUS_TRANSITION");
    }
  });

  it("returns FORBIDDEN when SoD violated (submitter = approver)", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INVOICE_ID,
        status: "submitted",
        submittedByPrincipalId: PRINCIPAL_A,
      },
    ]);
    mockSelectWhere.mockReturnValueOnce({
      limit: vi.fn().mockResolvedValue([]),
    });

    const pCtx = makePolicyCtx({
      principalId: PRINCIPAL_A,
      permissions: [Permissions.apInvoiceApprove],
    });

    const result = await approveInvoice(mockDb, CTX, pCtx, CORRELATION_ID, INVOICE_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SHARED_FORBIDDEN");
    }
  });

  it("returns INSUFFICIENT_PERMISSIONS when missing ap.invoice.approve", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INVOICE_ID,
        status: "submitted",
        submittedByPrincipalId: PRINCIPAL_A,
      },
    ]);
    mockSelectWhere.mockReturnValueOnce({
      limit: vi.fn().mockResolvedValue([]),
    });

    const pCtx = makePolicyCtx({
      principalId: PRINCIPAL_B,
      permissions: [],
    });

    const result = await approveInvoice(mockDb, CTX, pCtx, CORRELATION_ID, INVOICE_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IAM_INSUFFICIENT_PERMISSIONS");
    }
  });
});

// ── rejectInvoice ────────────────────────────────────────────────────────────

describe("rejectInvoice", () => {
  it("returns ok when invoice is in submitted status", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INVOICE_ID,
        status: "submitted",
      },
    ]);

    const result = await rejectInvoice(
      mockDb,
      CTX,
      makePolicyCtx(),
      CORRELATION_ID,
      INVOICE_ID,
      "Duplicate invoice",
    );

    expect(result.ok).toBe(true);
  });

  it("returns AP_INVOICE_NOT_FOUND when invoice does not exist", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);

    const result = await rejectInvoice(
      mockDb,
      CTX,
      makePolicyCtx(),
      CORRELATION_ID,
      INVOICE_ID,
      "Reason",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_INVOICE_NOT_FOUND");
    }
  });

  it("returns INVALID_STATUS_TRANSITION when invoice is in approved status", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INVOICE_ID,
        status: "approved",
      },
    ]);

    const result = await rejectInvoice(
      mockDb,
      CTX,
      makePolicyCtx(),
      CORRELATION_ID,
      INVOICE_ID,
      "Reason",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_INVOICE_INVALID_STATUS_TRANSITION");
    }
  });
});

// ── voidInvoice ──────────────────────────────────────────────────────────────

describe("voidInvoice", () => {
  it("returns ok when invoice is in submitted status", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INVOICE_ID,
        status: "submitted",
      },
    ]);

    const result = await voidInvoice(
      mockDb,
      CTX,
      makePolicyCtx(),
      CORRELATION_ID,
      INVOICE_ID,
      "Customer cancelled",
    );

    expect(result.ok).toBe(true);
  });

  it("returns AP_INVOICE_ALREADY_VOIDED when already voided", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INVOICE_ID,
        status: "voided",
      },
    ]);

    const result = await voidInvoice(
      mockDb,
      CTX,
      makePolicyCtx(),
      CORRELATION_ID,
      INVOICE_ID,
      "Reason",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_INVOICE_ALREADY_VOIDED");
    }
  });

  it("returns INVALID_STATUS_TRANSITION for paid invoices", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INVOICE_ID,
        status: "paid",
      },
    ]);

    const result = await voidInvoice(
      mockDb,
      CTX,
      makePolicyCtx(),
      CORRELATION_ID,
      INVOICE_ID,
      "Reason",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_INVOICE_INVALID_STATUS_TRANSITION");
    }
  });

  it("returns AP_INVOICE_NOT_FOUND when invoice does not exist", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);

    const result = await voidInvoice(
      mockDb,
      CTX,
      makePolicyCtx(),
      CORRELATION_ID,
      INVOICE_ID,
      "Reason",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_INVOICE_NOT_FOUND");
    }
  });
});
