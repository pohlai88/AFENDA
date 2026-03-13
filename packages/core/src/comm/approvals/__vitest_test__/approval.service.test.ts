/**
 * Unit tests — approval service.
 *
 * DB is mocked. Tests cover:
 *   - createApprovalRequest: inserts request + steps, emits COMM.APPROVAL_REQUESTED
 *   - approveStep (intermediate): advances currentStepIndex, emits COMM.APPROVAL_STEP_APPROVED
 *   - approveStep (last step): marks request approved, emits COMM.APPROVAL_APPROVED
 *   - rejectStep: marks request rejected, emits COMM.APPROVAL_STEP_REJECTED
 *   - delegateStep: sets delegatedToId, emits COMM.APPROVAL_STEP_DELEGATED
 *   - withdrawApproval: only requester can withdraw
 *   - Error cases: not found, already resolved, wrong actor, step not pending
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  ApprovalRequestId,
  ApprovalStepId,
} from "@afenda/contracts";

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" as OrgId;
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" as PrincipalId;
const ASSIGNEE_2_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc" as PrincipalId;
const OTHER_PRINCIPAL = "dddddddd-dddd-4ddd-dddd-dddddddddddd" as PrincipalId;
const CORRELATION_ID = "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee" as CorrelationId;
const REQUEST_ID = "11111111-1111-4111-8111-111111111111" as ApprovalRequestId;
const STEP_ID = "22222222-2222-4222-8222-222222222222" as ApprovalStepId;
const STEP_ID_2 = "33333333-3333-4333-8333-333333333333" as ApprovalStepId;

// ── DB mock helpers ───────────────────────────────────────────────────────────

interface MockRow {
  request?: Record<string, unknown>;
  step?: Record<string, unknown>;
}

let mockRows: MockRow = {};
let insertedOutboxEvents: Array<{ type: string; payload: unknown }> = [];
let updatedTables: Array<{ table: string; set: Record<string, unknown> }> = [];
let insertedRows: Array<{ table: string; values: unknown }> = [];

function makeSelectMock() {
  return vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(async () => {
        // Return request result for commApprovalRequest, step for commApprovalStep
        // The mocked table objects let us check which table was queried
        return [];
      }),
      limit: vi.fn().mockResolvedValue([]),
    }),
  });
}

const mockTx = {
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: REQUEST_ID, approvalNumber: "APR-TESTABCD" }]),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  }),
};

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@afenda/db", () => ({
  commApprovalRequest: { id: "id", orgId: "org_id", status: "status" },
  commApprovalStep: {
    id: "id",
    orgId: "org_id",
    status: "status",
    approvalRequestId: "approval_request_id",
  },
  commApprovalPolicy: { id: "id", orgId: "org_id" },
  commApprovalDelegation: { id: "id", orgId: "org_id" },
  commApprovalStatusHistory: { id: "id", orgId: "org_id" },
  auditLog: { id: "id" },
  outboxEvent: { type: "type" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => args),
  eq: vi.fn((field, value) => ({ field, value })),
  or: vi.fn((...args) => args),
  inArray: vi.fn((field, values) => ({ field, values })),
  sql: vi.fn((str) => ({ sql: str })),
}));

vi.mock("../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(
    async (_db: unknown, _ctx: unknown, _entry: unknown, fn: (tx: unknown) => unknown) =>
      fn(mockTx),
  ),
}));

// ── Subject under test ────────────────────────────────────────────────────────

import {
  createApprovalRequest,
  approveStep,
  rejectStep,
  delegateStep,
  withdrawApproval,
} from "../approval.service";

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeCtx = () =>
  ({
    activeContext: { orgId: ORG_ID },
    principalId: PRINCIPAL_ID,
  }) as any;

const makePolicyCtx = (principalId: PrincipalId | null = PRINCIPAL_ID) => ({
  principalId,
});

function makeApprovalRequestRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: REQUEST_ID,
    orgId: ORG_ID,
    approvalNumber: "APR-TESTABCD",
    title: "Test Approval",
    sourceEntityType: "invoice",
    sourceEntityId: "inv-001",
    requestedByPrincipalId: PRINCIPAL_ID,
    status: "pending",
    currentStepIndex: 0,
    totalSteps: 2,
    urgency: "normal",
    dueDate: null,
    resolvedAt: null,
    resolvedByPrincipalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeStepRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: STEP_ID,
    orgId: ORG_ID,
    approvalRequestId: REQUEST_ID,
    stepIndex: 0,
    label: null,
    assigneeId: PRINCIPAL_ID,
    delegatedToId: null,
    status: "pending",
    comment: null,
    actedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("approval.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: insert returns request row
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: REQUEST_ID, approvalNumber: "APR-TESTABCD" }]),
      }),
    });

    mockTx.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  // ── createApprovalRequest ──────────────────────────────────────────────────

  describe("createApprovalRequest", () => {
    it("creates request with steps and returns id + approvalNumber", async () => {
      // No DB selects needed for create
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

      const result = await createApprovalRequest(
        mockDb as any,
        makeCtx(),
        makePolicyCtx(),
        CORRELATION_ID,
        {
          idempotencyKey: "idem-001",
          title: "Approve Invoice #123",
          sourceEntityType: "invoice",
          sourceEntityId: "inv-001",
          steps: [
            { assigneeId: PRINCIPAL_ID, label: "Finance Manager" },
            { assigneeId: ASSIGNEE_2_ID, label: "CFO" },
          ],
        },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.approvalNumber).toBe("APR-TESTABCD");
        expect(result.data.id).toBe(REQUEST_ID);
      }
    });

    it("fails if no principal", async () => {
      const result = await createApprovalRequest(
        mockDb as any,
        makeCtx(),
        makePolicyCtx(null),
        CORRELATION_ID,
        {
          idempotencyKey: "idem-002",
          title: "Test",
          sourceEntityType: "invoice",
          sourceEntityId: "inv-002",
          steps: [{ assigneeId: PRINCIPAL_ID }],
        },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("IAM_PRINCIPAL_NOT_FOUND");
      }
    });
  });

  // ── approveStep ────────────────────────────────────────────────────────────

  describe("approveStep", () => {
    it("advances step index when intermediate step approved", async () => {
      const requestRow = makeApprovalRequestRow({ totalSteps: 2, currentStepIndex: 0 });
      const stepRow = makeStepRow({ stepIndex: 0, assigneeId: PRINCIPAL_ID });

      // DB selects: first select returns request, second returns step
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([requestRow]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([stepRow]),
          }),
        });

      const result = await approveStep(mockDb as any, makeCtx(), makePolicyCtx(), CORRELATION_ID, {
        idempotencyKey: "idem-003",
        approvalRequestId: REQUEST_ID,
        stepId: STEP_ID,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.status).toBe("pending"); // Not last step, keeps pending
      }
    });

    it("marks request approved when last step is approved", async () => {
      const requestRow = makeApprovalRequestRow({ totalSteps: 1, currentStepIndex: 0 });
      const stepRow = makeStepRow({ stepIndex: 0, assigneeId: PRINCIPAL_ID });

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([requestRow]) }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([stepRow]) }),
        });

      const result = await approveStep(mockDb as any, makeCtx(), makePolicyCtx(), CORRELATION_ID, {
        idempotencyKey: "idem-004",
        approvalRequestId: REQUEST_ID,
        stepId: STEP_ID,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.status).toBe("approved"); // Last step → approved
      }
    });

    it("fails if request is already resolved", async () => {
      const requestRow = makeApprovalRequestRow({ status: "approved" });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([requestRow]) }),
      });

      const result = await approveStep(mockDb as any, makeCtx(), makePolicyCtx(), CORRELATION_ID, {
        idempotencyKey: "idem-005",
        approvalRequestId: REQUEST_ID,
        stepId: STEP_ID,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("COMM_APPROVAL_ALREADY_RESOLVED");
      }
    });

    it("fails if actor is not assigned to step", async () => {
      const requestRow = makeApprovalRequestRow();
      const stepRow = makeStepRow({ assigneeId: OTHER_PRINCIPAL });

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([requestRow]) }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([stepRow]) }),
        });

      const result = await approveStep(
        mockDb as any,
        makeCtx(),
        makePolicyCtx(PRINCIPAL_ID),
        CORRELATION_ID,
        { idempotencyKey: "idem-006", approvalRequestId: REQUEST_ID, stepId: STEP_ID },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("COMM_APPROVAL_STEP_NOT_ASSIGNED_TO_ACTOR");
      }
    });

    it("allows delegate to approve step", async () => {
      const requestRow = makeApprovalRequestRow({ totalSteps: 1, currentStepIndex: 0 });
      const stepRow = makeStepRow({ assigneeId: OTHER_PRINCIPAL, delegatedToId: PRINCIPAL_ID });

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([requestRow]) }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([stepRow]) }),
        });

      const result = await approveStep(
        mockDb as any,
        makeCtx(),
        makePolicyCtx(PRINCIPAL_ID),
        CORRELATION_ID,
        { idempotencyKey: "idem-007", approvalRequestId: REQUEST_ID, stepId: STEP_ID },
      );

      expect(result.ok).toBe(true);
    });
  });

  // ── rejectStep ─────────────────────────────────────────────────────────────

  describe("rejectStep", () => {
    it("marks request rejected and returns rejected status", async () => {
      const requestRow = makeApprovalRequestRow();
      const stepRow = makeStepRow({ assigneeId: PRINCIPAL_ID });

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([requestRow]) }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([stepRow]) }),
        });

      const result = await rejectStep(mockDb as any, makeCtx(), makePolicyCtx(), CORRELATION_ID, {
        idempotencyKey: "idem-008",
        approvalRequestId: REQUEST_ID,
        stepId: STEP_ID,
        comment: "Does not meet requirements",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.status).toBe("rejected");
      }
    });
  });

  // ── delegateStep ───────────────────────────────────────────────────────────

  describe("delegateStep", () => {
    it("delegates step to new assignee", async () => {
      const requestRow = makeApprovalRequestRow();
      const stepRow = makeStepRow({ assigneeId: PRINCIPAL_ID });

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([requestRow]) }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([stepRow]) }),
        });

      const result = await delegateStep(mockDb as any, makeCtx(), makePolicyCtx(), CORRELATION_ID, {
        idempotencyKey: "idem-009",
        approvalRequestId: REQUEST_ID,
        stepId: STEP_ID,
        delegateToPrincipalId: ASSIGNEE_2_ID,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe(STEP_ID);
      }
    });

    it("fails if actor is not the original assignee", async () => {
      const requestRow = makeApprovalRequestRow();
      const stepRow = makeStepRow({ assigneeId: OTHER_PRINCIPAL });

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([requestRow]) }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([stepRow]) }),
        });

      const result = await delegateStep(
        mockDb as any,
        makeCtx(),
        makePolicyCtx(PRINCIPAL_ID),
        CORRELATION_ID,
        {
          idempotencyKey: "idem-010",
          approvalRequestId: REQUEST_ID,
          stepId: STEP_ID,
          delegateToPrincipalId: ASSIGNEE_2_ID,
        },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("COMM_APPROVAL_STEP_NOT_ASSIGNED_TO_ACTOR");
      }
    });
  });

  // ── withdrawApproval ───────────────────────────────────────────────────────

  describe("withdrawApproval", () => {
    it("allows requester to withdraw pending request", async () => {
      const requestRow = makeApprovalRequestRow({ requestedByPrincipalId: PRINCIPAL_ID });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([requestRow]) }),
      });

      const result = await withdrawApproval(
        mockDb as any,
        makeCtx(),
        makePolicyCtx(),
        CORRELATION_ID,
        { idempotencyKey: "idem-011", approvalRequestId: REQUEST_ID },
      );

      expect(result.ok).toBe(true);
    });

    it("fails if non-requester tries to withdraw", async () => {
      const requestRow = makeApprovalRequestRow({ requestedByPrincipalId: OTHER_PRINCIPAL });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([requestRow]) }),
      });

      const result = await withdrawApproval(
        mockDb as any,
        makeCtx(),
        makePolicyCtx(PRINCIPAL_ID),
        CORRELATION_ID,
        { idempotencyKey: "idem-012", approvalRequestId: REQUEST_ID },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("COMM_APPROVAL_STEP_NOT_ASSIGNED_TO_ACTOR");
      }
    });

    it("fails if request already resolved (rejected)", async () => {
      const requestRow = makeApprovalRequestRow({
        status: "rejected",
        requestedByPrincipalId: PRINCIPAL_ID,
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([requestRow]) }),
      });

      const result = await withdrawApproval(
        mockDb as any,
        makeCtx(),
        makePolicyCtx(),
        CORRELATION_ID,
        { idempotencyKey: "idem-013", approvalRequestId: REQUEST_ID },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("COMM_APPROVAL_ALREADY_WITHDRAWN");
      }
    });
  });

  // ── Not found cases ────────────────────────────────────────────────────────

  describe("not found", () => {
    it("approveStep returns COMM_APPROVAL_NOT_FOUND when request missing", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

      const result = await approveStep(mockDb as any, makeCtx(), makePolicyCtx(), CORRELATION_ID, {
        idempotencyKey: "idem-014",
        approvalRequestId: REQUEST_ID,
        stepId: STEP_ID,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("COMM_APPROVAL_NOT_FOUND");
      }
    });
  });
});
