import { describe, expect, it } from "vitest";
import {
  WorkflowSchema,
  WorkflowRunSchema,
  WorkflowStatusValues,
  WorkflowRunStatusValues,
} from "../workflow.entity.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const WF_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const RUN_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const BASE_WORKFLOW = {
  id: WF_ID,
  orgId: ORG_ID,
  name: "Auto-escalate overdue tasks",
  description: null,
  status: "active" as const,
  trigger: { type: "task.created" as const },
  actions: [{ type: "send_notification" as const, config: {} }],
  createdByPrincipalId: PRINCIPAL_ID,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  lastTriggeredAt: null,
  runCount: 0,
};

describe("workflow.entity – WorkflowSchema", () => {
  it("accepts a valid workflow", () => {
    expect(WorkflowSchema.safeParse(BASE_WORKFLOW).success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = WorkflowSchema.safeParse({ ...BASE_WORKFLOW, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects actions array with >10 items", () => {
    const actions = Array.from({ length: 11 }, () => ({
      type: "send_notification" as const,
      config: {},
    }));
    const result = WorkflowSchema.safeParse({ ...BASE_WORKFLOW, actions });
    expect(result.success).toBe(false);
  });

  it("accepts all valid statuses", () => {
    for (const status of WorkflowStatusValues) {
      expect(WorkflowSchema.safeParse({ ...BASE_WORKFLOW, status }).success).toBe(true);
    }
  });
});

describe("workflow.entity – WorkflowRunSchema", () => {
  const BASE_RUN = {
    id: RUN_ID,
    orgId: ORG_ID,
    workflowId: WF_ID,
    status: "completed" as const,
    triggerEventId: null,
    triggerPayload: {},
    startedAt: "2026-01-01T10:00:00.000Z",
    completedAt: "2026-01-01T10:00:05.000Z",
    error: null,
    executedActions: [],
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:05.000Z",
  };

  it("accepts a valid workflow run", () => {
    expect(WorkflowRunSchema.safeParse(BASE_RUN).success).toBe(true);
  });

  it("accepts all valid run statuses", () => {
    for (const status of WorkflowRunStatusValues) {
      expect(WorkflowRunSchema.safeParse({ ...BASE_RUN, status }).success).toBe(true);
    }
  });

  it("accepts run with executed actions", () => {
    const result = WorkflowRunSchema.safeParse({
      ...BASE_RUN,
      executedActions: [{ actionType: "send_notification", status: "completed", result: {} }],
    });
    expect(result.success).toBe(true);
  });
});
