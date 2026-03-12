/**
 * Unit tests for treasury-payment-batch service:
 * createPaymentBatch, requestPaymentBatchRelease, releasePaymentBatch.
 *
 * Key invariants tested:
 *  - blocks empty batch creation
 *  - blocks batching instructions that are not in "processing" status
 *  - blocks dimension mismatch (different source accounts)
 *  - blocks releasing a batch already released
 *  - enforces SOD for payment instructions (tested via approvePaymentInstruction)
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId, PrincipalId, CorrelationId, PaymentBatchId, PaymentInstructionId } from "@afenda/contracts";

// ── Mock DB setup ─────────────────────────────────────────────────────────────

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockSelectWhereResult: unknown[] = [];
const mockSelectWhere = vi.fn(() => mockSelectWhereResult);
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
} as any;

vi.mock("@afenda/db", () => ({
  treasuryPaymentBatch: {
    id: "id",
    orgId: "org_id",
    sourceBankAccountId: "source_bank_account_id",
    status: "status",
    totalAmountMinor: "total_amount_minor",
    itemCount: "item_count",
    requestedReleaseAt: "requested_release_at",
    approvedAt: "approved_at",
    releasedAt: "released_at",
    updatedAt: "updated_at",
  },
  treasuryPaymentBatchItem: {
    id: "id",
    orgId: "org_id",
    batchId: "batch_id",
    paymentInstructionId: "payment_instruction_id",
    amountMinor: "amount_minor",
  },
  treasuryPaymentInstruction: {
    id: "id",
    orgId: "org_id",
    status: "status",
    amountMinor: "amount_minor",
    sourceBankAccountId: "source_bank_account_id",
    currencyCode: "currency_code",
    createdByPrincipalId: "created_by_principal_id",
  },
  bankAccount: {
    id: "id",
    orgId: "org_id",
    status: "status",
  },
  outboxEvent: {},
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, _val: unknown) => ({})),
    and: vi.fn((..._args: unknown[]) => ({})),
    inArray: vi.fn((_col: unknown, _vals: unknown) => ({})),
    sql: Object.assign(vi.fn(() => ({})), { raw: vi.fn(() => ({})) }),
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => fn(mockDb)),
}));

import {
  createPaymentBatch,
  requestPaymentBatchRelease,
  releasePaymentBatch,
} from "../treasury-payment-batch.service";

import { approvePaymentInstruction } from "../treasury-payment-instruction.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const PRINCIPAL_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" as PrincipalId;
const PRINCIPAL_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const BATCH_ID = "55555555-5555-5555-5555-555555555555" as PaymentBatchId;
const INSTR_ID_1 = "66666666-6666-6666-6666-666666666661" as PaymentInstructionId;
const INSTR_ID_2 = "66666666-6666-6666-6666-666666666662" as PaymentInstructionId;
const ACCOUNT_ID = "77777777-7777-7777-7777-777777777777" as any;

const CTX = { activeContext: { orgId: ORG_ID } };
const POLICY_CTX = { principalId: PRINCIPAL_A };

const MOCK_ACTIVE_ACCOUNT = { id: ACCOUNT_ID, status: "active" };

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectWhere.mockResolvedValue([]);
  mockInsertReturning.mockResolvedValue([{ id: BATCH_ID }]);
  mockUpdateWhere.mockResolvedValue([]);
});

// ── createPaymentBatch ────────────────────────────────────────────────────────

describe("createPaymentBatch", () => {
  it("blocks empty instruction list", async () => {
    const result = await createPaymentBatch(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      sourceBankAccountId: ACCOUNT_ID,
      paymentInstructionIds: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_PAYMENT_BATCH_EMPTY");
    }
  });

  it("blocks instructions that are not in processing status", async () => {
    // bank account query
    mockSelectWhere.mockResolvedValueOnce([MOCK_ACTIVE_ACCOUNT]);
    // instructions query — one is "pending" not "processing"
    mockSelectWhere.mockResolvedValueOnce([
      { id: INSTR_ID_1, status: "pending", amountMinor: "5000", sourceBankAccountId: ACCOUNT_ID, currencyCode: "USD" },
      { id: INSTR_ID_2, status: "processing", amountMinor: "3000", sourceBankAccountId: ACCOUNT_ID, currencyCode: "USD" },
    ]);

    const result = await createPaymentBatch(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      sourceBankAccountId: ACCOUNT_ID,
      paymentInstructionIds: [INSTR_ID_1, INSTR_ID_2],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_PAYMENT_BATCH_INSTRUCTION_NOT_APPROVED");
    }
  });

  it("blocks dimension mismatch — instructions from different source accounts", async () => {
    const DIFF_ACCOUNT = "99999999-9999-9999-9999-999999999999";

    mockSelectWhere.mockResolvedValueOnce([MOCK_ACTIVE_ACCOUNT]);
    mockSelectWhere.mockResolvedValueOnce([
      { id: INSTR_ID_1, status: "processing", amountMinor: "5000", sourceBankAccountId: ACCOUNT_ID, currencyCode: "USD" },
      { id: INSTR_ID_2, status: "processing", amountMinor: "3000", sourceBankAccountId: DIFF_ACCOUNT, currencyCode: "USD" },
    ]);

    const result = await createPaymentBatch(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      sourceBankAccountId: ACCOUNT_ID,
      paymentInstructionIds: [INSTR_ID_1, INSTR_ID_2],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_PAYMENT_BATCH_DIMENSION_MISMATCH");
    }
  });
});

// ── requestPaymentBatchRelease ────────────────────────────────────────────────

describe("requestPaymentBatchRelease", () => {
  it("requests release on a draft batch", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: BATCH_ID, status: "draft" }]);

    const result = await requestPaymentBatchRelease(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      batchId: BATCH_ID,
    });

    expect(result.ok).toBe(true);
  });

  it("blocks release request on a non-draft batch", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: BATCH_ID, status: "released" }]);

    const result = await requestPaymentBatchRelease(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      batchId: BATCH_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_PAYMENT_BATCH_NOT_DRAFT");
    }
  });
});

// ── releasePaymentBatch ───────────────────────────────────────────────────────

describe("releasePaymentBatch", () => {
  it("releases a pending_approval batch", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: BATCH_ID, status: "pending_approval", totalAmountMinor: "10000" }]);

    const result = await releasePaymentBatch(mockDb, CTX, POLICY_CTX, CORRELATION_ID, { batchId: BATCH_ID });

    expect(result.ok).toBe(true);
  });

  it("blocks releasing an already-released batch", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: BATCH_ID, status: "released", totalAmountMinor: "10000" }]);

    const result = await releasePaymentBatch(mockDb, CTX, POLICY_CTX, CORRELATION_ID, { batchId: BATCH_ID });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_PAYMENT_BATCH_ALREADY_RELEASED");
    }
  });
});

// ── SOD: creator cannot approve instruction ───────────────────────────────────

describe("approvePaymentInstruction SOD", () => {
  it("blocks approval by the same principal who created the instruction", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INSTR_ID_1,
        status: "processing",
        createdByPrincipalId: PRINCIPAL_A, // same as approver
      },
    ]);

    const result = await approvePaymentInstruction(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      paymentInstructionId: INSTR_ID_1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_PAYMENT_SOD_VIOLATION");
    }
  });

  it("allows approval by a different principal", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: INSTR_ID_1,
        status: "processing",
        createdByPrincipalId: PRINCIPAL_B, // different from approver
      },
    ]);

    const result = await approvePaymentInstruction(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      paymentInstructionId: INSTR_ID_1,
    });

    expect(result.ok).toBe(true);
  });
});
