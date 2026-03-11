/**
 * Unit tests for prepayment service — create, apply, void.
 *
 * Verifies service exports and basic error handling.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId, PrincipalId, CorrelationId } from "@afenda/contracts";

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockSelectFrom = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
} as any;

vi.mock("@afenda/db", () => ({
  prepayment: {},
  prepaymentApplication: {},
  supplier: {},
  invoice: {},
  outboxEvent: {},
  auditLog: {},
}));

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => fn(mockDb)),
}));

import { createPrepayment, applyPrepayment, voidPrepayment } from "../prepayment.service";

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const SUPPLIER_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const CTX = { activeContext: { orgId: ORG_ID } };
const POLICY_CTX = { principalId: null as PrincipalId | null, permissionsSet: new Set<string>() };

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectFrom.mockReturnValue({
    where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
  });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
});

describe("createPrepayment", () => {
  it("returns error when supplier not found", async () => {
    mockSelectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
    });

    const result = await createPrepayment(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      {
        supplierId: SUPPLIER_ID,
        prepaymentNumber: "PP-2026-0001",
        currencyCode: "USD",
        amountMinor: 10000n,
        paymentDate: "2026-03-10",
        paymentReference: "REF-001",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SUP_SUPPLIER_NOT_FOUND");
    }
  });

  it("returns error when prepayment number already exists", async () => {
    // First query: supplier found; second query: duplicate prepayment number found
    mockSelectFrom
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: SUPPLIER_ID }]) }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: "existing-pp" }]) }),
      });

    const result = await createPrepayment(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      supplierId: SUPPLIER_ID,
      prepaymentNumber: "PP-2026-0001",
      currencyCode: "USD",
      amountMinor: 10000n,
      paymentDate: "2026-03-10",
      paymentReference: "REF-001",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PREPAYMENT_NUMBER_EXISTS");
      expect(result.error.meta?.prepaymentNumber).toBe("PP-2026-0001");
    }
  });

  it("returns ok and emits prepayment-created outbox event on success", async () => {
    mockSelectFrom
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: SUPPLIER_ID }]) }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      });

    mockInsertReturning.mockResolvedValueOnce([{ id: "pp-new" }]);

    const result = await createPrepayment(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      supplierId: SUPPLIER_ID,
      prepaymentNumber: "PP-2026-0001",
      currencyCode: "USD",
      amountMinor: 10000n,
      paymentDate: "2026-03-10",
      paymentReference: "REF-001",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("pp-new");
    }

    const insertedRows = mockInsertValues.mock.calls.map((call) => call[0]);
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "AP.PREPAYMENT_CREATED",
          payload: expect.objectContaining({
            prepaymentId: "pp-new",
            supplierId: SUPPLIER_ID,
            amountMinor: "10000",
          }),
        }),
      ]),
    );
  });
});

describe("applyPrepayment", () => {
  it("returns error when prepayment not found", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await applyPrepayment(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      {
        prepaymentId: "nonexistent-id",
        invoiceId: "invoice-id",
        amountMinor: 1000n,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PREPAYMENT_NOT_FOUND");
    }
  });

  it("returns error when prepayment is voided", async () => {
    mockSelectFrom.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          {
            id: "pp-id",
            status: "VOIDED",
            balanceMinor: 1000n,
            currencyCode: "USD",
            supplierId: SUPPLIER_ID,
          },
        ]),
      }),
    });

    const result = await applyPrepayment(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      prepaymentId: "pp-id",
      invoiceId: "invoice-id",
      amountMinor: 500n,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PREPAYMENT_ALREADY_VOIDED");
    }
  });

  it("returns error when amount exceeds available balance", async () => {
    mockSelectFrom.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          {
            id: "pp-id",
            status: "ACTIVE",
            balanceMinor: 500n,
            currencyCode: "USD",
            supplierId: SUPPLIER_ID,
          },
        ]),
      }),
    });

    const result = await applyPrepayment(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      prepaymentId: "pp-id",
      invoiceId: "invoice-id",
      amountMinor: 1000n, // exceeds balance of 500n
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PREPAYMENT_INSUFFICIENT_BALANCE");
    }
  });

  it("returns error when invoice not found", async () => {
    // First query: prepayment found (active, enough balance)
    // Second query: invoice not found
    mockSelectFrom
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "pp-id",
              status: "ACTIVE",
              balanceMinor: 10000n,
              currencyCode: "USD",
              supplierId: SUPPLIER_ID,
            },
          ]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      });

    const result = await applyPrepayment(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      prepaymentId: "pp-id",
      invoiceId: "nonexistent-invoice",
      amountMinor: 500n,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_INVOICE_NOT_FOUND");
    }
  });

  it("returns error when invoice supplier does not match prepayment supplier", async () => {
    // First query: prepayment found
    // Second query: invoice found but different supplier
    mockSelectFrom
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "pp-id",
              status: "ACTIVE",
              balanceMinor: 10000n,
              currencyCode: "USD",
              supplierId: SUPPLIER_ID,
            },
          ]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "inv-id",
              supplierId: "different-supplier",
              currencyCode: "USD",
            },
          ]),
        }),
      });

    const result = await applyPrepayment(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      prepaymentId: "pp-id",
      invoiceId: "inv-id",
      amountMinor: 500n,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PREPAYMENT_SUPPLIER_MISMATCH");
    }
  });

  it("returns error when prepayment and invoice currencies differ", async () => {
    // First query: prepayment found
    // Second query: invoice found with different currency
    mockSelectFrom
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "pp-id",
              status: "ACTIVE",
              balanceMinor: 10000n,
              currencyCode: "USD",
              supplierId: SUPPLIER_ID,
            },
          ]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "inv-id",
              supplierId: SUPPLIER_ID,
              currencyCode: "EUR",
            },
          ]),
        }),
      });

    const result = await applyPrepayment(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      prepaymentId: "pp-id",
      invoiceId: "inv-id",
      amountMinor: 500n,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PREPAYMENT_CURRENCY_MISMATCH");
    }
  });

  it("returns ok and emits prepayment-applied outbox event on success", async () => {
    mockSelectFrom
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "pp-id",
              status: "ACTIVE",
              balanceMinor: 500n,
              currencyCode: "USD",
              supplierId: SUPPLIER_ID,
            },
          ]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "inv-id",
              supplierId: SUPPLIER_ID,
              currencyCode: "USD",
            },
          ]),
        }),
      });

    mockInsertReturning.mockResolvedValueOnce([{ id: "app-1" }]);

    const result = await applyPrepayment(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      prepaymentId: "pp-id",
      invoiceId: "inv-id",
      amountMinor: 500n,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.applicationId).toBe("app-1");
    }

    const insertedRows = mockInsertValues.mock.calls.map((call) => call[0]);
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "AP.PREPAYMENT_APPLIED",
          payload: expect.objectContaining({
            prepaymentId: "pp-id",
            invoiceId: "inv-id",
            applicationId: "app-1",
            amountMinor: "500",
          }),
        }),
      ]),
    );

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "DEPLETED", balanceMinor: 0n }),
    );
  });
});

describe("voidPrepayment", () => {
  it("returns error when prepayment not found", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await voidPrepayment(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      {
        prepaymentId: "nonexistent-id",
        reason: "Test void",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PREPAYMENT_NOT_FOUND");
    }
  });

  it("returns error when prepayment is already voided", async () => {
    mockSelectFrom.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          { id: "pp-id", status: "VOIDED" },
        ]),
      }),
    });

    const result = await voidPrepayment(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      prepaymentId: "pp-id",
      reason: "already voided",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PREPAYMENT_ALREADY_VOIDED");
    }
  });

  it("returns error when prepayment is depleted", async () => {
    mockSelectFrom.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          { id: "pp-id", status: "DEPLETED" },
        ]),
      }),
    });

    const result = await voidPrepayment(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      prepaymentId: "pp-id",
      reason: "cannot void depleted",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PREPAYMENT_ALREADY_VOIDED");
    }
  });

  it("returns ok and emits prepayment-voided outbox event on success", async () => {
    mockSelectFrom.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ id: "pp-id", status: "ACTIVE" }]),
      }),
    });

    const result = await voidPrepayment(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      prepaymentId: "pp-id",
      reason: "testing void",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("pp-id");
    }

    const insertedRows = mockInsertValues.mock.calls.map((call) => call[0]);
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "AP.PREPAYMENT_VOIDED",
          payload: expect.objectContaining({
            prepaymentId: "pp-id",
            reason: "testing void",
          }),
        }),
      ]),
    );
  });
});
