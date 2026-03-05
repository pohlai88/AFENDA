/**
 * Unit tests for GL posting service.
 *
 * Uses vi.mock("@afenda/db") to mock DB operations.
 * Tests cover: postToGL, reverseJournalEntry — happy paths and guards.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  JournalEntryId,
  AccountId,
  InvoiceId,
} from "@afenda/contracts";
import { Permissions } from "@afenda/contracts";
import type { PolicyContext } from "../../sod.js";
import type { OrgScopedContext } from "../../../infra/audit.js";

// ── Mock setup ───────────────────────────────────────────────────────────────

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockSelectFrom = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
} as any;

// Mock @afenda/db tables
vi.mock("@afenda/db", () => ({
  journalEntry: { id: "id", orgId: "org_id" },
  journalLine: { journalEntryId: "journal_entry_id" },
  account: { id: "id", orgId: "org_id", isActive: "is_active" },
  outboxEvent: {},
}));

// Mock audit service
vi.mock("../../../infra/audit.js", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => {
    return fn(mockDb);
  }),
}));

// Mock numbering service
vi.mock("../../../infra/numbering.js", () => ({
  nextNumber: vi.fn(async () => "JE-2026-0001"),
}));

import { postToGL, reverseJournalEntry } from "../posting.service.js";

// ── Test constants ───────────────────────────────────────────────────────────

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const PRINCIPAL_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const ENTRY_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd" as JournalEntryId;
const ACCOUNT_1 = "11111111-aaaa-aaaa-aaaa-111111111111" as AccountId;
const ACCOUNT_2 = "22222222-aaaa-aaaa-aaaa-222222222222" as AccountId;

const CTX: OrgScopedContext = { activeContext: { orgId: ORG_ID } };

function makePolicyCtx(overrides: Partial<PolicyContext> & { permissions?: string[] } = {}): PolicyContext {
  const { permissions, ...rest } = overrides as any;
  return {
    principalId: PRINCIPAL_A,
    permissionsSet: new Set(permissions ?? [Permissions.glJournalPost]),
    ...rest,
  };
}

const BALANCED_LINES = [
  { accountId: ACCOUNT_1, debitMinor: 10000n, creditMinor: 0n, currencyCode: "USD" },
  { accountId: ACCOUNT_2, debitMinor: 0n, creditMinor: 10000n, currencyCode: "USD" },
];

// ── Reset mocks ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
  // Default: returning resolves to empty array (safe fallback)
  mockInsertReturning.mockResolvedValue([]);
});

// ── postToGL ─────────────────────────────────────────────────────────────────

describe("postToGL", () => {
  it("returns ok with entry id and number on success", async () => {
    // Accounts exist and are active
    mockSelectWhere.mockResolvedValueOnce([
      { id: ACCOUNT_1, isActive: true },
      { id: ACCOUNT_2, isActive: true },
    ]);
    // Insert journal entry returning id
    mockInsertReturning.mockResolvedValueOnce([{ id: ENTRY_ID }]);

    const result = await postToGL(
      mockDb,
      CTX,
      makePolicyCtx(),
      {
        correlationId: CORRELATION_ID,
        idempotencyKey: "idem-1",
        lines: BALANCED_LINES,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.entryNumber).toBe("JE-2026-0001");
    }
  });

  it("returns INSUFFICIENT_PERMISSIONS when missing gl.journal.post", async () => {
    const pCtx = makePolicyCtx({ permissions: [] });

    const result = await postToGL(
      mockDb,
      CTX,
      pCtx,
      {
        correlationId: CORRELATION_ID,
        idempotencyKey: "idem-2",
        lines: BALANCED_LINES,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IAM_INSUFFICIENT_PERMISSIONS");
    }
  });

  it("returns GL_JOURNAL_UNBALANCED when lines do not balance", async () => {
    const result = await postToGL(
      mockDb,
      CTX,
      makePolicyCtx(),
      {
        correlationId: CORRELATION_ID,
        idempotencyKey: "idem-3",
        lines: [
          { accountId: ACCOUNT_1, debitMinor: 10000n, creditMinor: 0n, currencyCode: "USD" },
          { accountId: ACCOUNT_2, debitMinor: 0n, creditMinor: 5000n, currencyCode: "USD" },
        ],
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("GL_JOURNAL_UNBALANCED");
    }
  });

  it("returns GL_ACCOUNT_NOT_FOUND when an account does not exist", async () => {
    // Only one account found
    mockSelectWhere.mockResolvedValueOnce([
      { id: ACCOUNT_1, isActive: true },
    ]);

    const result = await postToGL(
      mockDb,
      CTX,
      makePolicyCtx(),
      {
        correlationId: CORRELATION_ID,
        idempotencyKey: "idem-4",
        lines: BALANCED_LINES,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("GL_ACCOUNT_NOT_FOUND");
    }
  });

  it("returns GL_ACCOUNT_INACTIVE when an account is deactivated", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      { id: ACCOUNT_1, isActive: true },
      { id: ACCOUNT_2, isActive: false },
    ]);

    const result = await postToGL(
      mockDb,
      CTX,
      makePolicyCtx(),
      {
        correlationId: CORRELATION_ID,
        idempotencyKey: "idem-5",
        lines: BALANCED_LINES,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("GL_ACCOUNT_INACTIVE");
    }
  });
});

// ── reverseJournalEntry ──────────────────────────────────────────────────────

describe("reverseJournalEntry", () => {
  it("returns ok with reversal entry id and number", async () => {
    // Original entry exists
    mockSelectWhere.mockResolvedValueOnce([{
      id: ENTRY_ID,
      orgId: ORG_ID,
      entryNumber: "JE-2026-0001",
      sourceInvoiceId: null,
    }]);
    // Original lines
    mockSelectWhere.mockResolvedValueOnce([
      { id: "l1", journalEntryId: ENTRY_ID, accountId: ACCOUNT_1, debitMinor: 10000n, creditMinor: 0n, currencyCode: "USD", memo: null, dimensions: null },
      { id: "l2", journalEntryId: ENTRY_ID, accountId: ACCOUNT_2, debitMinor: 0n, creditMinor: 10000n, currencyCode: "USD", memo: null, dimensions: null },
    ]);
    // Insert reversal
    mockInsertReturning.mockResolvedValueOnce([{ id: "rev-id" }]);

    const result = await reverseJournalEntry(
      mockDb,
      CTX,
      makePolicyCtx(),
      CORRELATION_ID,
      ENTRY_ID,
      "Correcting error",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.entryNumber).toBe("JE-2026-0001");
    }
  });

  it("returns INSUFFICIENT_PERMISSIONS when missing gl.journal.post", async () => {
    const pCtx = makePolicyCtx({ permissions: [] });

    const result = await reverseJournalEntry(
      mockDb, CTX, pCtx, CORRELATION_ID, ENTRY_ID,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IAM_INSUFFICIENT_PERMISSIONS");
    }
  });

  it("returns NOT_FOUND when journal entry does not exist", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);

    const result = await reverseJournalEntry(
      mockDb, CTX, makePolicyCtx(), CORRELATION_ID, ENTRY_ID,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SHARED_NOT_FOUND");
    }
  });
});
