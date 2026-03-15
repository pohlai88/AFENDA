import { describe, expect, it } from "vitest";
import {
  CommWorkflowCreatedPayloadSchema,
  CommWorkflowUpdatedPayloadSchema,
  CommWorkflowStatusChangedPayloadSchema,
  CommWorkflowDeletedPayloadSchema,
  CommWorkflowTriggeredPayloadSchema,
  CommWorkflowRunCompletedPayloadSchema,
  CommWorkflowRunFailedPayloadSchema,
} from "../workflow.events.payloads.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const WF_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const RUN_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";

describe("workflow.events.payloads – CommWorkflowCreatedPayloadSchema", () => {
  it("accepts valid payload", () => {
    const result = CommWorkflowCreatedPayloadSchema.safeParse({
      workflowId: WF_ID,
      orgId: ORG_ID,
      name: "Auto-escalate overdue tasks",
      createdByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing correlationId", () => {
    const result = CommWorkflowCreatedPayloadSchema.safeParse({
      workflowId: WF_ID,
      orgId: ORG_ID,
      name: "Test",
      createdByPrincipalId: PRINCIPAL_ID,
    });
    expect(result.success).toBe(false);
  });
});

describe("workflow.events.payloads – CommWorkflowUpdatedPayloadSchema", () => {
  it("accepts valid payload", () => {
    const result = CommWorkflowUpdatedPayloadSchema.safeParse({
      workflowId: WF_ID,
      orgId: ORG_ID,
      updatedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("workflow.events.payloads – CommWorkflowStatusChangedPayloadSchema", () => {
  it("accepts valid status change payload", () => {
    const result = CommWorkflowStatusChangedPayloadSchema.safeParse({
      workflowId: WF_ID,
      orgId: ORG_ID,
      fromStatus: "draft",
      toStatus: "active",
      changedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid fromStatus", () => {
    const result = CommWorkflowStatusChangedPayloadSchema.safeParse({
      workflowId: WF_ID,
      orgId: ORG_ID,
      fromStatus: "invalid",
      toStatus: "active",
      changedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });
});

describe("workflow.events.payloads – CommWorkflowDeletedPayloadSchema", () => {
  it("accepts valid payload", () => {
    const result = CommWorkflowDeletedPayloadSchema.safeParse({
      workflowId: WF_ID,
      orgId: ORG_ID,
      deletedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("workflow.events.payloads – CommWorkflowTriggeredPayloadSchema", () => {
  it("accepts valid triggered payload", () => {
    const result = CommWorkflowTriggeredPayloadSchema.safeParse({
      workflowId: WF_ID,
      workflowRunId: RUN_ID,
      orgId: ORG_ID,
      triggerType: "task.created",
      triggerPayload: { taskId: "some-task" },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid triggerType", () => {
    const result = CommWorkflowTriggeredPayloadSchema.safeParse({
      workflowId: WF_ID,
      workflowRunId: RUN_ID,
      orgId: ORG_ID,
      triggerType: "unknown.event",
      triggerPayload: {},
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });
});

describe("workflow.events.payloads – CommWorkflowRunCompletedPayloadSchema", () => {
  it("accepts valid run completed payload", () => {
    const result = CommWorkflowRunCompletedPayloadSchema.safeParse({
      workflowRunId: RUN_ID,
      workflowId: WF_ID,
      orgId: ORG_ID,
      completedAt: "2026-01-01T10:00:05.000Z",
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("workflow.events.payloads – CommWorkflowRunFailedPayloadSchema", () => {
  it("accepts valid run failed payload", () => {
    const result = CommWorkflowRunFailedPayloadSchema.safeParse({
      workflowRunId: RUN_ID,
      workflowId: WF_ID,
      orgId: ORG_ID,
      error: "Action timeout after 30s",
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty error string", () => {
    const result = CommWorkflowRunFailedPayloadSchema.safeParse({
      workflowRunId: RUN_ID,
      workflowId: WF_ID,
      orgId: ORG_ID,
      error: "",
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });
});
