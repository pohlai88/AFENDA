import { describe, expect, it } from "vitest";
import { WorkflowOutboxRecordSchema } from "../workflow.outbox.js";
import { CommWorkflowEvents } from "../workflow.events.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const WF_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const RUN_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";
const RECORD_ID = "11111111-1111-4111-8111-111111111111";

const BASE = {
  id: RECORD_ID,
  createdAt: "2026-01-01T00:00:00.000Z",
  processedAt: null,
};

describe("workflow.outbox – WorkflowOutboxRecordSchema", () => {
  it("accepts WORKFLOW_CREATED with valid payload", () => {
    const result = WorkflowOutboxRecordSchema.safeParse({
      ...BASE,
      eventName: CommWorkflowEvents.Created,
      payload: {
        workflowId: WF_ID,
        orgId: ORG_ID,
        name: "Auto-escalate",
        createdByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts WORKFLOW_UPDATED with valid payload", () => {
    const result = WorkflowOutboxRecordSchema.safeParse({
      ...BASE,
      eventName: CommWorkflowEvents.Updated,
      payload: {
        workflowId: WF_ID,
        orgId: ORG_ID,
        updatedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts WORKFLOW_TRIGGERED with valid payload", () => {
    const result = WorkflowOutboxRecordSchema.safeParse({
      ...BASE,
      eventName: CommWorkflowEvents.Triggered,
      payload: {
        workflowId: WF_ID,
        workflowRunId: RUN_ID,
        orgId: ORG_ID,
        triggerType: "task.created",
        triggerPayload: { taskId: "some-task" },
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts WORKFLOW_RUN_COMPLETED with valid payload", () => {
    const result = WorkflowOutboxRecordSchema.safeParse({
      ...BASE,
      eventName: CommWorkflowEvents.RunCompleted,
      payload: {
        workflowRunId: RUN_ID,
        workflowId: WF_ID,
        orgId: ORG_ID,
        completedAt: "2026-01-01T10:00:05.000Z",
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts WORKFLOW_RUN_FAILED with valid payload", () => {
    const result = WorkflowOutboxRecordSchema.safeParse({
      ...BASE,
      eventName: CommWorkflowEvents.RunFailed,
      payload: {
        workflowRunId: RUN_ID,
        workflowId: WF_ID,
        orgId: ORG_ID,
        error: "Action timeout",
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown eventName", () => {
    const result = WorkflowOutboxRecordSchema.safeParse({
      ...BASE,
      eventName: "COMM.WORKFLOW_UNKNOWN",
      payload: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects WORKFLOW_CREATED with invalid payload (missing name)", () => {
    const result = WorkflowOutboxRecordSchema.safeParse({
      ...BASE,
      eventName: CommWorkflowEvents.Created,
      payload: {
        workflowId: WF_ID,
        orgId: ORG_ID,
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(false);
  });
});
