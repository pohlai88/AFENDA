/**
 * Unit tests for match-tolerance service — create, update, deactivate.
 *
 * Verifies duplicate-scope guard, not-found paths, idempotent deactivation,
 * and success branches across all three mutations.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId, PrincipalId, CorrelationId, MatchToleranceId } from "@afenda/contracts";

// ── Mock DB setup ─────────────────────────────────────────────────────────────

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
} as any;

vi.mock("@afenda/db", () => ({
  matchTolerance: {
    id: "id",
    orgId: "org_id",
    scope: "scope",
    scopeEntityId: "scope_entity_id",
    varianceType: "variance_type",
    isActive: "is_active",
  },
  outboxEvent: {},
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, _val: unknown) => ({})),
    and: vi.fn((...args: unknown[]) => ({})),
    isNull: vi.fn((_col: unknown) => ({})),
    sql: Object.assign(vi.fn(() => ({})), { raw: vi.fn(() => ({})) }),
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => fn(mockDb)),
}));

import {
  createMatchTolerance,
  updateMatchTolerance,
  deactivateMatchTolerance,
} from "../match-tolerance.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const PRINCIPAL_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const TOLERANCE_ID = "tttttttt-tttt-tttt-tttt-tttttttttttt" as MatchToleranceId;

const CTX = { activeContext: { orgId: ORG_ID } };
const POLICY_CTX = { principalId: PRINCIPAL_ID };

const BASE_CREATE_PARAMS = {
  scope: "ORG" as const,
  varianceType: "PRICE" as const,
  name: "Org-level price tolerance",
  tolerancePercent: 2.5,
  effectiveFrom: "2026-01-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
});

// ── createMatchTolerance ──────────────────────────────────────────────────────

describe("createMatchTolerance", () => {
  it("returns duplicate scope error when tolerance already exists for scope+variance", async () => {
    mockSelectWhere.mockResolvedValue([{ id: TOLERANCE_ID }]);

    const result = await createMatchTolerance(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      BASE_CREATE_PARAMS,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_MATCH_TOLERANCE_DUPLICATE_SCOPE");
      expect(result.error.meta?.scope).toBe("ORG");
      expect(result.error.meta?.varianceType).toBe("PRICE");
    }
  });

  it("returns ok with tolerance id on success", async () => {
    // No existing tolerance found
    mockSelectWhere.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ id: TOLERANCE_ID }]);

    const result = await createMatchTolerance(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      BASE_CREATE_PARAMS,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(TOLERANCE_ID);
    }
  });

  it("returns ok for SUPPLIER scope with scopeEntityId", async () => {
    mockSelectWhere.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ id: TOLERANCE_ID }]);

    const result = await createMatchTolerance(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      {
        ...BASE_CREATE_PARAMS,
        scope: "SUPPLIER",
        scopeEntityId: "supplier-uuid",
        varianceType: "QUANTITY",
        tolerancePercent: 1.0,
      },
    );

    expect(result.ok).toBe(true);
  });

  it("returns ok for TOTAL variance type with maxAmountMinor cap", async () => {
    mockSelectWhere.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ id: TOLERANCE_ID }]);

    const result = await createMatchTolerance(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      {
        ...BASE_CREATE_PARAMS,
        varianceType: "TOTAL",
        maxAmountMinor: 50000n, // $500 cap
        currencyCode: "USD",
      },
    );

    expect(result.ok).toBe(true);
  });
});

// ── updateMatchTolerance ──────────────────────────────────────────────────────

describe("updateMatchTolerance", () => {
  it("returns not-found error when tolerance does not exist", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await updateMatchTolerance(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      { matchToleranceId: TOLERANCE_ID, name: "Updated name" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_MATCH_TOLERANCE_NOT_FOUND");
      expect(result.error.meta?.matchToleranceId).toBe(TOLERANCE_ID);
    }
  });

  it("returns ok with tolerance id on successful update", async () => {
    mockSelectWhere.mockResolvedValue([{ id: TOLERANCE_ID }]);
    mockUpdateWhere.mockResolvedValue([{ id: TOLERANCE_ID }]);

    const result = await updateMatchTolerance(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      {
        matchToleranceId: TOLERANCE_ID,
        name: "Updated tolerance name",
        tolerancePercent: 3.0,
        effectiveTo: "2026-12-31",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(TOLERANCE_ID);
    }
  });

  it("returns ok when updating only priority field", async () => {
    mockSelectWhere.mockResolvedValue([{ id: TOLERANCE_ID }]);
    mockUpdateWhere.mockResolvedValue([]);

    const result = await updateMatchTolerance(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      { matchToleranceId: TOLERANCE_ID, priority: 10 },
    );

    expect(result.ok).toBe(true);
  });
});

// ── deactivateMatchTolerance ──────────────────────────────────────────────────

describe("deactivateMatchTolerance", () => {
  it("returns not-found error when tolerance does not exist", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await deactivateMatchTolerance(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      { matchToleranceId: TOLERANCE_ID },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_MATCH_TOLERANCE_NOT_FOUND");
    }
  });

  it("returns ok idempotently when tolerance is already inactive (isActive=0)", async () => {
    mockSelectWhere.mockResolvedValue([{ id: TOLERANCE_ID, isActive: 0 }]);

    const result = await deactivateMatchTolerance(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      { matchToleranceId: TOLERANCE_ID, reason: "Superseded by updated policy" },
    );

    // Idempotent — already deactivated is still ok
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(TOLERANCE_ID);
    }
  });

  it("returns ok on successful deactivation of active tolerance", async () => {
    mockSelectWhere.mockResolvedValue([{ id: TOLERANCE_ID, isActive: 1 }]);
    mockUpdateWhere.mockResolvedValue([]);

    const result = await deactivateMatchTolerance(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      { matchToleranceId: TOLERANCE_ID, reason: "Expired policy" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(TOLERANCE_ID);
    }
  });

  it("returns ok without reason (reason is optional)", async () => {
    mockSelectWhere.mockResolvedValue([{ id: TOLERANCE_ID, isActive: 1 }]);
    mockUpdateWhere.mockResolvedValue([]);

    const result = await deactivateMatchTolerance(
      mockDb,
      CTX,
      POLICY_CTX,
      CORRELATION_ID,
      { matchToleranceId: TOLERANCE_ID },
    );

    expect(result.ok).toBe(true);
  });
});
