/**
 * Unit tests for bank-account service:
 * createBankAccount, updateBankAccount, activateBankAccount, deactivateBankAccount.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId, PrincipalId, CorrelationId, BankAccountId } from "@afenda/contracts";

// ── Mock DB setup ─────────────────────────────────────────────────────────────

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockSelectLimit = vi.fn();
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
    accountNumber: "account_number",
    status: "status",
    activatedAt: "activated_at",
    deactivatedAt: "deactivated_at",
    updatedAt: "updated_at",
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
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => fn(mockDb)),
}));

import {
  createBankAccount,
  updateBankAccount,
  activateBankAccount,
  deactivateBankAccount,
} from "../bank-account.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const PRINCIPAL_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const BANK_ACCOUNT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" as BankAccountId;

const CTX = { activeContext: { orgId: ORG_ID } };
const POLICY_CTX = { principalId: PRINCIPAL_A };

const CREATE_PARAMS = {
  accountName: "Operating Account",
  bankName: "Test Bank",
  accountNumber: "ACC-001",
  currencyCode: "USD",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectLimit.mockResolvedValue([]);
  // Default: no existing record
  mockSelectWhere.mockResolvedValue([]);
});

// ── createBankAccount ─────────────────────────────────────────────────────────

describe("createBankAccount", () => {
  it("returns ok with new bank account id", async () => {
    mockInsertReturning.mockResolvedValue([{ id: BANK_ACCOUNT_ID }]);

    const result = await createBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, CREATE_PARAMS);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(BANK_ACCOUNT_ID);
    }
  });

  it("inserts with correct fields including default status inactive", async () => {
    mockInsertReturning.mockResolvedValue([{ id: BANK_ACCOUNT_ID }]);

    await createBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, CREATE_PARAMS);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: ORG_ID,
        accountName: "Operating Account",
        bankName: "Test Bank",
        accountNumber: "ACC-001",
        currencyCode: "USD",
        isPrimary: false,
      }),
    );
  });

  it("emits TREAS.BANK_ACCOUNT_CREATED outbox event", async () => {
    mockInsertReturning.mockResolvedValue([{ id: BANK_ACCOUNT_ID }]);

    await createBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, CREATE_PARAMS);

    const outboxCall = mockInsertValues.mock.calls.find(
      (call) => call[0]?.type === "TREAS.BANK_ACCOUNT_CREATED",
    );
    expect(outboxCall).toBeDefined();
    expect(outboxCall![0]).toMatchObject({
      type: "TREAS.BANK_ACCOUNT_CREATED",
      orgId: ORG_ID,
      correlationId: CORRELATION_ID,
      payload: expect.objectContaining({ bankAccountId: BANK_ACCOUNT_ID }),
    });
  });

  it("returns TREAS_BANK_ACCOUNT_NUMBER_EXISTS when account number already taken", async () => {
    // Duplicate check returns an existing row
    mockSelectWhere.mockResolvedValue([{ id: "existing-id" }]);

    const result = await createBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, CREATE_PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_BANK_ACCOUNT_NUMBER_EXISTS");
    }
  });
});

// ── updateBankAccount ─────────────────────────────────────────────────────────

describe("updateBankAccount", () => {
  it("returns ok with updated bank account id", async () => {
    // Lookup finds existing account
    mockSelectWhere.mockResolvedValueOnce([{ id: BANK_ACCOUNT_ID, status: "inactive" }]);
    mockUpdateReturning.mockResolvedValue([{ id: BANK_ACCOUNT_ID }]);

    const result = await updateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
      accountName: "Updated Name",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(BANK_ACCOUNT_ID);
    }
  });

  it("returns TREAS_BANK_ACCOUNT_NOT_FOUND when account does not exist", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await updateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
      accountName: "Updated",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_BANK_ACCOUNT_NOT_FOUND");
    }
  });

  it("returns TREAS_BANK_ACCOUNT_NUMBER_EXISTS when new account number is already taken by another account", async () => {
    // First lookup (existing account) succeeds
    mockSelectWhere.mockResolvedValueOnce([{ id: BANK_ACCOUNT_ID, status: "inactive" }]);
    // Duplicate number check finds a different account
    mockSelectWhere.mockResolvedValueOnce([{ id: "other-id" }]);

    const result = await updateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
      accountNumber: "ACC-TAKEN",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_BANK_ACCOUNT_NUMBER_EXISTS");
    }
  });
});

// ── activateBankAccount ───────────────────────────────────────────────────────

describe("activateBankAccount", () => {
  it("returns ok when account transitions from inactive to active", async () => {
    mockSelectWhere.mockResolvedValue([{ id: BANK_ACCOUNT_ID, status: "inactive" }]);

    const result = await activateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
    });

    expect(result.ok).toBe(true);
  });

  it("returns ok idempotently when account is already active", async () => {
    mockSelectWhere.mockResolvedValue([{ id: BANK_ACCOUNT_ID, status: "active" }]);

    const result = await activateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
    });

    expect(result.ok).toBe(true);
    // No update should be issued for an already-active account
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns TREAS_BANK_ACCOUNT_SUSPENDED when account is suspended", async () => {
    mockSelectWhere.mockResolvedValue([{ id: BANK_ACCOUNT_ID, status: "suspended" }]);

    const result = await activateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_BANK_ACCOUNT_SUSPENDED");
    }
  });

  it("returns TREAS_BANK_ACCOUNT_NOT_FOUND when account does not exist", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await activateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_BANK_ACCOUNT_NOT_FOUND");
    }
  });

  it("emits TREAS.BANK_ACCOUNT_ACTIVATED outbox event", async () => {
    mockSelectWhere.mockResolvedValue([{ id: BANK_ACCOUNT_ID, status: "inactive" }]);

    await activateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
    });

    const outboxCall = mockInsertValues.mock.calls.find(
      (call) => call[0]?.type === "TREAS.BANK_ACCOUNT_ACTIVATED",
    );
    expect(outboxCall).toBeDefined();
    expect(outboxCall![0]).toMatchObject({
      type: "TREAS.BANK_ACCOUNT_ACTIVATED",
      orgId: ORG_ID,
      payload: expect.objectContaining({ bankAccountId: BANK_ACCOUNT_ID }),
    });
  });
});

// ── deactivateBankAccount ─────────────────────────────────────────────────────

describe("deactivateBankAccount", () => {
  it("returns ok when account transitions from active to inactive", async () => {
    mockSelectWhere.mockResolvedValue([{ id: BANK_ACCOUNT_ID, status: "active" }]);

    const result = await deactivateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
    });

    expect(result.ok).toBe(true);
  });

  it("returns ok idempotently when account is already inactive", async () => {
    mockSelectWhere.mockResolvedValue([{ id: BANK_ACCOUNT_ID, status: "inactive" }]);

    const result = await deactivateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
    });

    expect(result.ok).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns TREAS_BANK_ACCOUNT_NOT_FOUND when account does not exist", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await deactivateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_BANK_ACCOUNT_NOT_FOUND");
    }
  });

  it("emits TREAS.BANK_ACCOUNT_DEACTIVATED outbox event", async () => {
    mockSelectWhere.mockResolvedValue([{ id: BANK_ACCOUNT_ID, status: "active" }]);

    await deactivateBankAccount(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      id: BANK_ACCOUNT_ID,
    });

    const outboxCall = mockInsertValues.mock.calls.find(
      (call) => call[0]?.type === "TREAS.BANK_ACCOUNT_DEACTIVATED",
    );
    expect(outboxCall).toBeDefined();
    expect(outboxCall![0]).toMatchObject({
      type: "TREAS.BANK_ACCOUNT_DEACTIVATED",
      orgId: ORG_ID,
      payload: expect.objectContaining({ bankAccountId: BANK_ACCOUNT_ID }),
    });
  });
});
