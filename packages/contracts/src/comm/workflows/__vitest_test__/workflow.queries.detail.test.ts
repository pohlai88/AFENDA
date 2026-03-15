import { describe, expect, it } from "vitest";
import {
  GetWorkflowResponseSchema,
  GetWorkflowRunResponseSchema,
  ListWorkflowsResponseSchema,
  ListWorkflowRunsResponseSchema,
} from "../workflow.queries.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const WF_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const RUN_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";

const BASE_WORKFLOW = {
  id: WF_ID,
  orgId: ORG_ID,
  name: "Auto-escalate",
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

const META = { cursor: null, hasMore: false, limit: 50 };

describe("workflow.queries – GetWorkflowResponseSchema", () => {
  it("accepts a valid get workflow response", () => {
    const result = GetWorkflowResponseSchema.safeParse({
      data: BASE_WORKFLOW,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("workflow.queries – GetWorkflowRunResponseSchema", () => {
  it("accepts a valid get workflow run response", () => {
    const result = GetWorkflowRunResponseSchema.safeParse({
      data: BASE_RUN,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("workflow.queries – list responses", () => {
  it("accepts a valid workflow list response", () => {
    const result = ListWorkflowsResponseSchema.safeParse({
      data: [BASE_WORKFLOW],
      meta: META,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid workflow run list response", () => {
    const result = ListWorkflowRunsResponseSchema.safeParse({
      data: [BASE_RUN],
      meta: META,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});
