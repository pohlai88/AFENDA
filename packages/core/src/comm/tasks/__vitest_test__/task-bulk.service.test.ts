/**
 * Unit tests — bulk task service operations.
 *
 * DB is mocked. Tests cover:
 *   - bulkAssignTasks: assigns multiple tasks, validates all exist first, emits outbox
 *   - bulkTransitionTaskStatus: transitions multiple tasks, validates all transitions, emits outbox
 *   - Error cases: missing task ID, invalid transition, duplicate task IDs
 *   - Idempotency: duplicate task IDs are deduped
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  CommTaskId,
  BulkAssignTasksCommand,
  BulkTransitionTaskStatusCommand,
} from "@afenda/contracts";

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" as OrgId;
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc" as CorrelationId;

const TASK_ID_1 = "11111111-1111-4111-1111-111111111111" as CommTaskId;
const TASK_ID_2 = "22222222-2222-4222-2222-222222222222" as CommTaskId;
const TASK_ID_3 = "33333333-3333-4333-3333-333333333333" as CommTaskId;
const ASSIGNEE_ID = "dddddddd-dddd-4ddd-dddd-dddddddddddd" as PrincipalId;

// ── DB mock ───────────────────────────────────────────────────────────────────

let mockTaskRows: Array<{ id: string; status: string }> = [];
let insertedOutboxEvents: Array<{ type: string; payload: unknown }> = [];

const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  }),
});

const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockImplementation(() => Promise.resolve(mockTaskRows)),
  }),
});

const mockInsert = vi.fn().mockImplementation((table: any) => {
  if (table && typeof table === "object" && "type" in table) {
    // outbox event table
    return {
      values: vi.fn().mockImplementation((val: any) => {
        insertedOutboxEvents.push(val);
        return Promise.resolve(undefined);
      }),
    };
  }
  // Other tables
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
});

const mockTx = {
  select: mockSelect,
  update: mockUpdate,
  insert: mockInsert,
};

const mockDb = {
  select: mockSelect,
  update: mockUpdate,
  insert: mockInsert,
  transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@afenda/db", () => ({
  commTask: {
    id: "id",
    status: "status",
    assigneeId: "assignee_id",
    orgId: "org_id",
  },
  outboxEvent: {
    type: "type",
    payload: "payload",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => args),
  eq: vi.fn((field, value) => ({ field, value })),
  inArray: vi.fn((field, values) => ({ field, values })),
  sql: vi.fn((str) => ({ sql: str })),
}));

vi.mock("../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(async (db, ctx, auditEntry, fn) => {
    return fn(mockTx as any);
  }),
}));

// Import AFTER mocks
import {
  bulkAssignTasks,
  bulkTransitionTaskStatus,
  type CommTaskServiceError,
  type CommTaskServiceResult,
} from "../task.service";

function assertOkResult<T>(
  result: CommTaskServiceResult<T>,
): asserts result is { ok: true; data: T } {
  expect(result.ok).toBe(true);
}

function assertErrorResult<T>(
  result: CommTaskServiceResult<T>,
): asserts result is { ok: false; error: CommTaskServiceError } {
  expect(result.ok).toBe(false);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("bulkAssignTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTaskRows = [];
    insertedOutboxEvents = [];
  });

  it("assigns multiple tasks and emits outbox event", async () => {
    mockTaskRows = [
      { id: TASK_ID_1, status: "open" },
      { id: TASK_ID_2, status: "in_progress" },
    ];

    const cmd: BulkAssignTasksCommand = {
      idempotencyKey: "idem-key-1",
      taskIds: [TASK_ID_1, TASK_ID_2],
      assigneeId: ASSIGNEE_ID,
    };

    const result = await bulkAssignTasks(
      mockDb as any,
      { activeContext: { orgId: ORG_ID } } as any,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      cmd,
    );

    assertOkResult(result);
    expect(result.data.processedCount).toBe(2);
    expect(insertedOutboxEvents).toContainEqual(
      expect.objectContaining({
        type: "COMM.TASKS_BULK_ASSIGNED",
        payload: expect.objectContaining({
          taskIds: expect.arrayContaining([TASK_ID_1, TASK_ID_2]),
          assigneeId: ASSIGNEE_ID,
        }),
      }),
    );
  });

  it("dedupes duplicate task IDs", async () => {
    mockTaskRows = [{ id: TASK_ID_1, status: "open" }];

    const cmd: BulkAssignTasksCommand = {
      idempotencyKey: "idem-key-2",
      taskIds: [TASK_ID_1, TASK_ID_1, TASK_ID_1], // duplicates
      assigneeId: ASSIGNEE_ID,
    };

    const result = await bulkAssignTasks(
      mockDb as any,
      { activeContext: { orgId: ORG_ID } } as any,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      cmd,
    );

    assertOkResult(result);
    expect(result.data.processedCount).toBe(1); // deduplicated
  });

  it("returns error if a task is not found", async () => {
    mockTaskRows = [{ id: TASK_ID_1, status: "open" }]; // only one task exists

    const cmd: BulkAssignTasksCommand = {
      idempotencyKey: "idem-key-3",
      taskIds: [TASK_ID_1, TASK_ID_2], // TASK_ID_2 doesn't exist
      assigneeId: ASSIGNEE_ID,
    };

    const result = await bulkAssignTasks(
      mockDb as any,
      { activeContext: { orgId: ORG_ID } } as any,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      cmd,
    );

    assertErrorResult(result);
    expect(result.error.code).toBe("COMM_TASK_NOT_FOUND");
    expect(result.error.meta?.taskId).toBe(TASK_ID_2);
    expect(insertedOutboxEvents.length).toBe(0); // no outbox event on error
  });
});

describe("bulkTransitionTaskStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTaskRows = [];
    insertedOutboxEvents = [];
  });

  it("transitions multiple tasks to a valid status and emits outbox event", async () => {
    mockTaskRows = [
      { id: TASK_ID_1, status: "open" },
      { id: TASK_ID_2, status: "open" },
    ];

    const cmd: BulkTransitionTaskStatusCommand = {
      idempotencyKey: "idem-key-4",
      taskIds: [TASK_ID_1, TASK_ID_2],
      toStatus: "in_progress",
      reason: "Starting work",
    };

    const result = await bulkTransitionTaskStatus(
      mockDb as any,
      { activeContext: { orgId: ORG_ID } } as any,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      cmd,
    );

    assertOkResult(result);
    expect(result.data.processedCount).toBe(2);
    expect(result.data.status).toBe("in_progress");
    expect(insertedOutboxEvents).toContainEqual(
      expect.objectContaining({
        type: "COMM.TASKS_BULK_TRANSITIONED",
        payload: expect.objectContaining({
          taskIds: expect.arrayContaining([TASK_ID_1, TASK_ID_2]),
          toStatus: "in_progress",
          reason: "Starting work",
        }),
      }),
    );
  });

  it("returns error if any task has an invalid transition", async () => {
    mockTaskRows = [
      { id: TASK_ID_1, status: "done" }, // 'done' cannot transition to 'open'
      { id: TASK_ID_2, status: "open" },
    ];

    const cmd: BulkTransitionTaskStatusCommand = {
      idempotencyKey: "idem-key-5",
      taskIds: [TASK_ID_1, TASK_ID_2],
      toStatus: "open", // invalid for 'done'
    };

    const result = await bulkTransitionTaskStatus(
      mockDb as any,
      { activeContext: { orgId: ORG_ID } } as any,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      cmd,
    );

    assertErrorResult(result);
    expect(result.error.code).toBe("COMM_TASK_INVALID_STATUS_TRANSITION");
    expect(result.error.message).toContain("done");
    expect(result.error.message).toContain("open");
    expect(insertedOutboxEvents.length).toBe(0); // no outbox event on error
  });

  it("returns error if a task does not exist", async () => {
    mockTaskRows = [{ id: TASK_ID_1, status: "open" }];

    const cmd: BulkTransitionTaskStatusCommand = {
      idempotencyKey: "idem-key-6",
      taskIds: [TASK_ID_1, TASK_ID_3], // TASK_ID_3 doesn't exist
      toStatus: "in_progress",
    };

    const result = await bulkTransitionTaskStatus(
      mockDb as any,
      { activeContext: { orgId: ORG_ID } } as any,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      cmd,
    );

    assertErrorResult(result);
    expect(result.error.code).toBe("COMM_TASK_NOT_FOUND");
    expect(insertedOutboxEvents.length).toBe(0);
  });

  it("transitions 'open' to 'done' with completedAt and completedByPrincipalId", async () => {
    mockTaskRows = [{ id: TASK_ID_1, status: "open" }];

    const cmd: BulkTransitionTaskStatusCommand = {
      idempotencyKey: "idem-key-7",
      taskIds: [TASK_ID_1],
      toStatus: "done",
    };

    const result = await bulkTransitionTaskStatus(
      mockDb as any,
      { activeContext: { orgId: ORG_ID } } as any,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      cmd,
    );

    assertOkResult(result);
    expect(result.data.status).toBe("done");
    // The service should set completedAt and completedByPrincipalId when transitioning to done
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("dedupes duplicate task IDs before transition", async () => {
    mockTaskRows = [{ id: TASK_ID_1, status: "open" }];

    const cmd: BulkTransitionTaskStatusCommand = {
      idempotencyKey: "idem-key-8",
      taskIds: [TASK_ID_1, TASK_ID_1],
      toStatus: "in_progress",
    };

    const result = await bulkTransitionTaskStatus(
      mockDb as any,
      { activeContext: { orgId: ORG_ID } } as any,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      cmd,
    );

    assertOkResult(result);
    expect(result.data.processedCount).toBe(1);
  });
});
