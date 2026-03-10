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

vi.mock("../../../../kernel/governance/audit/audit.js", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => fn(mockDb)),
}));

vi.mock("../../../../kernel/execution/numbering/numbering.js", () => ({
  nextNumber: vi.fn(async () => "PR-2026-0001"),
  ensureSequence: vi.fn(),
}));

import {
  createPaymentRun,
  approvePaymentRun,
  executePaymentRun,
} from "../payment-run.service.js";

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
});
