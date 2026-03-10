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

vi.mock("../../../../kernel/governance/audit/audit.js", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => fn(mockDb)),
}));

import { createPrepayment, applyPrepayment, voidPrepayment } from "../prepayment.service.js";

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
});
