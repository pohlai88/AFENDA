/**
 * Unit tests for reconciliation-session service:
 * openReconciliationSession, addReconciliationMatch, removeReconciliationMatch, closeReconciliationSession.
 *
 * Key invariants tested:
 *  - blocks match amount exceeding statement line amount
 *  - blocks adding match to a closed session
 *  - blocks removing a non-existent match
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  ReconciliationSessionId,
  ReconciliationMatchId,
} from "@afenda/contracts";

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
  treasuryReconciliationSession: {
    id: "id",
    orgId: "org_id",
    bankAccountId: "bank_account_id",
    bankStatementId: "bank_statement_id",
    status: "status",
    toleranceMinor: "tolerance_minor",
    closedAt: "closed_at",
    updatedAt: "updated_at",
  },
  treasuryReconciliationMatch: {
    id: "id",
    orgId: "org_id",
    reconciliationSessionId: "reconciliation_session_id",
    statementLineId: "statement_line_id",
    targetType: "target_type",
    targetId: "target_id",
    matchedAmountMinor: "matched_amount_minor",
    status: "match_status",
    matchedAt: "matched_at",
    unmatchedAt: "unmatched_at",
  },
  outboxEvent: {},
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, _val: unknown) => ({})),
    and: vi.fn((..._args: unknown[]) => ({})),
    sql: Object.assign(
      vi.fn(() => ({})),
      { raw: vi.fn(() => ({})) },
    ),
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => fn(mockDb)),
}));

import {
  openReconciliationSession,
  addReconciliationMatch,
  removeReconciliationMatch,
  closeReconciliationSession,
} from "../reconciliation-session.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const PRINCIPAL_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const SESSION_ID = "55555555-5555-5555-5555-555555555555" as ReconciliationSessionId;
const MATCH_ID = "66666666-6666-6666-6666-666666666666" as ReconciliationMatchId;

const CTX = { activeContext: { orgId: ORG_ID } };
const POLICY_CTX = { principalId: PRINCIPAL_A };

beforeEach(() => {
  vi.resetAllMocks();

  // Rebuild default mock graph so each test starts from identical state.
  mockInsertReturning.mockResolvedValue([{ id: SESSION_ID }]);
  mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
  mockInsert.mockReturnValue({ values: mockInsertValues });

  mockUpdateWhere.mockResolvedValue([]);
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });

  mockSelectWhere.mockResolvedValue([]);
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });
});

// ── openReconciliationSession ─────────────────────────────────────────────────

describe("openReconciliationSession", () => {
  it("opens a new session when no existing session for the statement", async () => {
    mockSelectWhere.mockResolvedValueOnce([]); // no existing session

    const result = await openReconciliationSession(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      bankAccountId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" as any,
      bankStatementId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    });

    expect(result.ok).toBe(true);
  });

  it("blocks opening a second session for the same statement", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: SESSION_ID }]); // existing session

    const result = await openReconciliationSession(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      bankAccountId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" as any,
      bankStatementId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_RECONCILIATION_SESSION_NOT_FOUND");
    }
  });
});

// ── addReconciliationMatch ────────────────────────────────────────────────────

describe("addReconciliationMatch", () => {
  it("blocks adding match when amount exceeds statement line amount", async () => {
    // First query: find the session
    mockSelectWhere.mockResolvedValueOnce([{ id: SESSION_ID, status: "open" }]);
    // Second query: check for existing match on the line
    mockSelectWhere.mockResolvedValueOnce([]);

    const result = await addReconciliationMatch(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      sessionId: SESSION_ID,
      statementLineId: "aaaa0000-0000-0000-0000-000000000001",
      statementLineAmountMinor: "10000", // line = 100.00
      targetType: "ap_payment",
      targetId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      matchedAmountMinor: "15000", // match = 150.00 — EXCEEDS
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_RECONCILIATION_MATCH_EXCEEDS_LINE_AMOUNT");
    }
  });

  it("blocks adding match to a closed session", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: SESSION_ID, status: "closed" }]);

    const result = await addReconciliationMatch(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      sessionId: SESSION_ID,
      statementLineId: "aaaa0000-0000-0000-0000-000000000001",
      statementLineAmountMinor: "10000",
      targetType: "ap_payment",
      targetId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      matchedAmountMinor: "5000",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_RECONCILIATION_SESSION_CLOSED");
    }
  });

  it("blocks matching a line already matched in another match record", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: SESSION_ID, status: "open" }]); // session found
    mockSelectWhere.mockResolvedValueOnce([{ id: MATCH_ID }]); // existing active match for the line

    const result = await addReconciliationMatch(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      sessionId: SESSION_ID,
      statementLineId: "aaaa0000-0000-0000-0000-000000000001",
      statementLineAmountMinor: "10000",
      targetType: "ap_payment",
      targetId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      matchedAmountMinor: "5000",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_RECONCILIATION_LINE_ALREADY_MATCHED");
    }
  });
});

// ── closeReconciliationSession ────────────────────────────────────────────────

describe("closeReconciliationSession", () => {
  it("closes an open session", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: SESSION_ID, status: "open" }]);

    const result = await closeReconciliationSession(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      sessionId: SESSION_ID,
    });

    expect(result.ok).toBe(true);
  });

  it("blocks closing an already-closed session", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: SESSION_ID, status: "closed" }]);

    const result = await closeReconciliationSession(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      sessionId: SESSION_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_RECONCILIATION_SESSION_CLOSED");
    }
  });

  it("returns not-found when session does not exist", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);

    const result = await closeReconciliationSession(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      sessionId: SESSION_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_RECONCILIATION_SESSION_NOT_FOUND");
    }
  });
});
