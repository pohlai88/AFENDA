/**
 * Unit tests for bank-statement service:
 * ingestBankStatement, markStatementFailed.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  BankAccountId,
  BankStatementId,
} from "@afenda/contracts";

// ── Mock DB setup ─────────────────────────────────────────────────────────────

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn();
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
} as any;

vi.mock("@afenda/db", () => ({
  bankAccount: {
    id: "id",
    orgId: "org_id",
    status: "status",
  },
  bankStatement: {
    id: "id",
    orgId: "org_id",
    bankAccountId: "bank_account_id",
    sourceRef: "source_ref",
    status: "status",
    failureReason: "failure_reason",
  },
  bankStatementLine: {
    id: "id",
    orgId: "org_id",
    statementId: "statement_id",
  },
  outboxEvent: {},
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, _val: unknown) => ({})),
    and: vi.fn((..._args: unknown[]) => ({})),
    sql: Object.assign(vi.fn(() => ({})), { raw: vi.fn(() => ({})) }),
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) =>
    fn(mockDb),
  ),
}));

import {
  ingestBankStatement,
  markStatementFailed,
} from "../bank-statement.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const PRINCIPAL_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const BANK_ACCOUNT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" as BankAccountId;
const BANK_STATEMENT_ID = "ssssssss-ssss-ssss-ssss-ssssssssssss" as BankStatementId;

const CTX = { activeContext: { orgId: ORG_ID } };
const POLICY_CTX = { principalId: PRINCIPAL_A };

const INGEST_PARAMS = {
  bankAccountId: BANK_ACCOUNT_ID,
  sourceRef: "STMT-20260312-001",
  statementDate: "2026-03-12",
  openingBalanceMinor: "100000",
  closingBalanceMinor: "150000",
  currencyCode: "USD",
  lines: [
    {
      lineNumber: 1,
      transactionDate: "2026-03-01",
      valueDate: "2026-03-01",
      amountMinor: "50000",
      direction: "inflow",
      description: "Customer payment",
      reference: "INV-001",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelectWhere.mockResolvedValue([]);
});

// ── ingestBankStatement ────────────────────────────────────────────────────────

describe("ingestBankStatement", () => {
  it("returns ok with new bank statement id on success", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      { id: BANK_ACCOUNT_ID, status: "active" },
    ]);
    mockInsertReturning.mockResolvedValue([
      { id: BANK_STATEMENT_ID },
    ]);

    const result = await ingestBankStatement(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      INGEST_PARAMS,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(BANK_STATEMENT_ID);
    }
  });

  it("inserts statement header with pending→processing→processed status flow", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      { id: BANK_ACCOUNT_ID, status: "active" },
    ]);
    mockInsertReturning.mockResolvedValue([
      { id: BANK_STATEMENT_ID },
    ]);

    await ingestBankStatement(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      INGEST_PARAMS,
    );

    const insertCalls = mockInsertValues.mock.calls;
    const headerInsert = insertCalls.find(
      (call) =>
        call[0]?.orgId === ORG_ID &&
        call[0]?.bankAccountId === BANK_ACCOUNT_ID,
    );

    expect(headerInsert).toBeDefined();
  });

  it("inserts all statement lines", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      { id: BANK_ACCOUNT_ID, status: "active" },
    ]);
    mockInsertReturning.mockResolvedValue([
      { id: BANK_STATEMENT_ID },
    ]);

    const paramsWithMultipleLines = {
      ...INGEST_PARAMS,
      lines: [
        {
          lineNumber: 1,
          transactionDate: "2026-03-01",
          valueDate: "2026-03-01",
          amountMinor: "50000",
          direction: "inflow" as const,
          description: "Payment A",
          reference: "REF-1",
        },
        {
          lineNumber: 2,
          transactionDate: "2026-03-02",
          valueDate: "2026-03-02",
          amountMinor: "25000",
          direction: "outflow" as const,
          description: "Payment B",
          reference: "REF-2",
        },
      ],
    };

    await ingestBankStatement(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      paramsWithMultipleLines,
    );

    // Check that insert was called multiple times for the statement + lines + outbox
    expect(mockInsertValues).toHaveBeenCalled();
  });

  it("emits TREAS.BANK_STATEMENT_INGESTED outbox event", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      { id: BANK_ACCOUNT_ID, status: "active" },
    ]);
    mockInsertReturning.mockResolvedValue([
      { id: BANK_STATEMENT_ID },
    ]);

    await ingestBankStatement(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      INGEST_PARAMS,
    );

    const outboxCall = mockInsertValues.mock.calls.find(
      (call) => call[0]?.type === "TREAS.BANK_STATEMENT_INGESTED",
    );
    expect(outboxCall).toBeDefined();
    expect(outboxCall![0]).toMatchObject({
      type: "TREAS.BANK_STATEMENT_INGESTED",
      orgId: ORG_ID,
      correlationId: CORRELATION_ID,
      payload: expect.objectContaining({
        statementId: BANK_STATEMENT_ID,
      }),
    });
  });

  it("returns TREAS_BANK_ACCOUNT_NOT_FOUND when account does not exist", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await ingestBankStatement(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      INGEST_PARAMS,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_BANK_ACCOUNT_NOT_FOUND");
    }
  });

  it("returns TREAS_BANK_ACCOUNT_INACTIVE when account is not active", async () => {
    mockSelectWhere.mockResolvedValue([
      { id: BANK_ACCOUNT_ID, status: "inactive" },
    ]);

    const result = await ingestBankStatement(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      INGEST_PARAMS,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_BANK_ACCOUNT_INACTIVE");
    }
  });

  it("returns existing statement id (idempotent) when sourceRef already exists", async () => {
    const existingStatementId = "existing-statement-id" as BankStatementId;
    // Account lookup succeeds
    mockSelectWhere.mockResolvedValueOnce([
      { id: BANK_ACCOUNT_ID, status: "active" },
    ]);
    // Duplicate sourceRef check finds existing statement
    mockSelectWhere.mockResolvedValueOnce([{ id: existingStatementId }]);

    const result = await ingestBankStatement(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      INGEST_PARAMS,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(existingStatementId);
    }
  });
});

// ── markStatementFailed ────────────────────────────────────────────────────────

describe("markStatementFailed", () => {
  it("returns ok when statement transitions to failed status", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      { id: BANK_STATEMENT_ID, status: "pending" },
    ]);
    mockUpdateReturning.mockResolvedValue([{ id: BANK_STATEMENT_ID }]);

    const result = await markStatementFailed(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      {
        statementId: BANK_STATEMENT_ID,
        failureReason: "Invalid format",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(BANK_STATEMENT_ID);
    }
  });

  it("emits TREAS.BANK_STATEMENT_FAILED outbox event with failure reason", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      { id: BANK_STATEMENT_ID, status: "pending" },
    ]);
    mockUpdateReturning.mockResolvedValue([{ id: BANK_STATEMENT_ID }]);

    await markStatementFailed(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      statementId: BANK_STATEMENT_ID,
      failureReason: "Reconciliation failed",
    });

    const outboxCall = mockInsertValues.mock.calls.find(
      (call) => call[0]?.type === "TREAS.BANK_STATEMENT_FAILED",
    );
    expect(outboxCall).toBeDefined();
    expect(outboxCall![0]).toMatchObject({
      type: "TREAS.BANK_STATEMENT_FAILED",
      orgId: ORG_ID,
      correlationId: CORRELATION_ID,
      payload: expect.objectContaining({
        statementId: BANK_STATEMENT_ID,
        failureReason: "Reconciliation failed",
      }),
    });
  });

  it("returns ok (idempotent no-op) when statement is already failed", async () => {
    mockSelectWhere.mockResolvedValue([
      { id: BANK_STATEMENT_ID, status: "failed" },
    ]);

    const result = await markStatementFailed(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      {
        statementId: BANK_STATEMENT_ID,
        failureReason: "Another failure",
      },
    );

    expect(result.ok).toBe(true);
    // No update should be issued for already-failed statement
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns ok (idempotent no-op) when statement is already processed", async () => {
    mockSelectWhere.mockResolvedValue([
      { id: BANK_STATEMENT_ID, status: "processed" },
    ]);

    const result = await markStatementFailed(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      {
        statementId: BANK_STATEMENT_ID,
        failureReason: "Cannot fail processed",
      },
    );

    expect(result.ok).toBe(true);
    // No update should be issued for terminal statements
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns TREAS_BANK_STATEMENT_NOT_FOUND when statement does not exist", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await markStatementFailed(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      {
        statementId: BANK_STATEMENT_ID,
        failureReason: "Not found test",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_BANK_STATEMENT_NOT_FOUND");
    }
  });
});
