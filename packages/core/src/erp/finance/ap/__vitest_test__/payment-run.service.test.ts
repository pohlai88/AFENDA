/**
 * Unit tests for payment run service — create, approve, execute.
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
  paymentRun: {},
  paymentRunItem: {},
  invoice: {},
  invoiceStatusHistory: {},
  outboxEvent: {},
  auditLog: {},
  sequence: {},
}));

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => fn(mockDb)),
}));

vi.mock("../../../../kernel/execution/numbering/numbering", () => ({
  nextNumber: vi.fn(async () => "PR-2026-0001"),
  ensureSequence: vi.fn(),
}));

import {
  createPaymentRun,
  approvePaymentRun,
  executePaymentRun,
} from "../payment-run.service";

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const CTX = { activeContext: { orgId: ORG_ID } };
const POLICY_CTX = { principalId: null as PrincipalId | null, permissionsSet: new Set<string>() };

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
});

describe("createPaymentRun", () => {
  it("returns ok with id and runNumber on success", async () => {
    mockInsertReturning.mockResolvedValue([{ id: "run-id", runNumber: "PR-2026-0001" }]);

    const result = await createPaymentRun(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      {
        paymentMethod: "ACH",
        currencyCode: "USD",
        paymentDate: "2026-03-10",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.runNumber).toBe("PR-2026-0001");
    }
  });
});

describe("approvePaymentRun", () => {
  it("returns error when payment run not found", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await approvePaymentRun(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      { paymentRunId: "nonexistent-id" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PAYMENT_RUN_NOT_FOUND");
    }
  });

  it("returns error when run is already approved", async () => {
    mockSelectWhere.mockResolvedValue([{ id: "run-id", status: "APPROVED", itemCount: 3 }]);

    const result = await approvePaymentRun(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      paymentRunId: "run-id",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PAYMENT_RUN_ALREADY_APPROVED");
    }
  });

  it("returns error when run has no items", async () => {
    mockSelectWhere.mockResolvedValue([{ id: "run-id", status: "DRAFT", itemCount: 0 }]);

    const result = await approvePaymentRun(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      paymentRunId: "run-id",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PAYMENT_RUN_EMPTY");
    }
  });

  it("returns ok when run approved successfully", async () => {
    mockSelectWhere.mockResolvedValue([{ id: "run-id", status: "DRAFT", itemCount: 2 }]);

    const result = await approvePaymentRun(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      paymentRunId: "run-id",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("run-id");
    }

    const insertedRows = mockInsertValues.mock.calls.map((call) => call[0]);
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "AP.PAYMENT_RUN_APPROVED",
          payload: expect.objectContaining({
            paymentRunId: "run-id",
          }),
        }),
      ]),
    );
  });

  it("returns error when run status is not draft", async () => {
    mockSelectWhere.mockResolvedValue([{ id: "run-id", status: "EXECUTING", itemCount: 1 }]);

    const result = await approvePaymentRun(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      paymentRunId: "run-id",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PAYMENT_RUN_NOT_DRAFT");
      expect(result.error.meta?.currentStatus).toBe("EXECUTING");
    }
  });
});

describe("executePaymentRun", () => {
  it("returns error when payment run not found", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await executePaymentRun(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      { paymentRunId: "nonexistent-id", bankReference: null },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PAYMENT_RUN_NOT_FOUND");
    }
  });

  it("returns error when run is already executed", async () => {
    mockSelectWhere.mockResolvedValue([{ id: "run-id", status: "EXECUTED" }]);

    const result = await executePaymentRun(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      paymentRunId: "run-id",
      bankReference: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PAYMENT_RUN_ALREADY_EXECUTED");
    }
  });

  it("returns error when run is not approved", async () => {
    mockSelectWhere.mockResolvedValue([{ id: "run-id", status: "DRAFT" }]);

    const result = await executePaymentRun(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      paymentRunId: "run-id",
      bankReference: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PAYMENT_RUN_NOT_DRAFT");
      expect(result.error.meta?.currentStatus).toBe("DRAFT");
    }
  });

  it("returns error when an invoice in run is not posted", async () => {
    mockSelectWhere
      .mockResolvedValueOnce([{ id: "run-id", status: "APPROVED" }])
      .mockResolvedValueOnce([
        {
          id: "item-1",
          invoiceId: "inv-1",
          amountPaidMinor: 1000n,
          invoiceNumber: "INV-001",
        },
      ])
      .mockResolvedValueOnce([{ status: "approved" }]);

    const result = await executePaymentRun(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      paymentRunId: "run-id",
      bankReference: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_INVOICE_INVALID_STATUS_TRANSITION");
      expect(result.error.meta?.invoiceId).toBe("inv-1");
    }
  });

  it("returns ok when run executed successfully (no items)", async () => {
    // First call: paymentRun status query; second: paymentRunItem empty set
    mockSelectWhere
      .mockResolvedValueOnce([{ id: "run-id", status: "APPROVED" }])
      .mockResolvedValueOnce([]);

    const result = await executePaymentRun(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      paymentRunId: "run-id",
      bankReference: "BANK-REF-001",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("run-id");
    }
  });

  it("returns ok when run executes with posted invoice item", async () => {
    mockSelectWhere
      .mockResolvedValueOnce([{ id: "run-id", status: "APPROVED" }])
      .mockResolvedValueOnce([
        {
          id: "item-1",
          invoiceId: "inv-1",
          amountPaidMinor: 2000n,
          invoiceNumber: "INV-2001",
        },
      ])
      .mockResolvedValueOnce([{ status: "posted" }]);

    const result = await executePaymentRun(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      paymentRunId: "run-id",
      bankReference: "BANK-OK-001",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("run-id");
    }

    expect(mockUpdateSet).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalled();

    const insertedRows = mockInsertValues.mock.calls.map((call) => call[0]);
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "AP.INVOICE_PAID",
          payload: expect.objectContaining({
            invoiceId: "inv-1",
            paymentRunId: "run-id",
            amountPaidMinor: "2000",
            paymentReference: "BANK-OK-001",
          }),
        }),
        expect.objectContaining({
          type: "AP.PAYMENT_RUN_EXECUTED",
          payload: expect.objectContaining({
            paymentRunId: "run-id",
            bankReference: "BANK-OK-001",
            itemCount: 1,
          }),
        }),
      ]),
    );
  });
});
