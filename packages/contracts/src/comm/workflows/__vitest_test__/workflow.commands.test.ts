import { describe, expect, it } from "vitest";
import {
  BulkExecuteWorkflowsCommandSchema,
  CreateWorkflowCommandSchema,
  UpdateWorkflowCommandSchema,
  ChangeWorkflowStatusCommandSchema,
  DeleteWorkflowCommandSchema,
  ExecuteWorkflowCommandSchema,
  CloneWorkflowCommandSchema,
  BulkChangeWorkflowStatusCommandSchema,
} from "../workflow.commands.js";

const IDEMPOTENCY_KEY = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const ORG_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const PRINCIPAL_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const WF_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const BASE = { idempotencyKey: IDEMPOTENCY_KEY, orgId: ORG_ID, principalId: PRINCIPAL_ID };

describe("workflow.commands – CreateWorkflowCommandSchema", () => {
  it("accepts a valid create command", () => {
    const result = CreateWorkflowCommandSchema.safeParse({
      ...BASE,
      name: "Test Workflow",
      trigger: { type: "task.created" },
      actions: [{ type: "send_notification", config: {} }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects when actions list is empty", () => {
    const result = CreateWorkflowCommandSchema.safeParse({
      ...BASE,
      name: "Test Workflow",
      trigger: { type: "task.created" },
      actions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects when actions list exceeds 10", () => {
    const actions = Array.from({ length: 11 }, () => ({
      type: "send_notification" as const,
      config: {},
    }));
    const result = CreateWorkflowCommandSchema.safeParse({
      ...BASE,
      name: "Test Workflow",
      trigger: { type: "task.created" },
      actions,
    });
    expect(result.success).toBe(false);
  });
});

describe("workflow.commands – UpdateWorkflowCommandSchema", () => {
  it("accepts a partial update", () => {
    const result = UpdateWorkflowCommandSchema.safeParse({
      ...BASE,
      workflowId: WF_ID,
      name: "Updated Name",
    });
    expect(result.success).toBe(true);
  });

  it("rejects no-op update (all optional fields absent)", () => {
    const result = UpdateWorkflowCommandSchema.safeParse({
      ...BASE,
      workflowId: WF_ID,
    });
    expect(result.success).toBe(false);
  });
});

describe("workflow.commands – ChangeWorkflowStatusCommandSchema", () => {
  it("accepts valid status change", () => {
    const result = ChangeWorkflowStatusCommandSchema.safeParse({
      ...BASE,
      workflowId: WF_ID,
      status: "paused",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = ChangeWorkflowStatusCommandSchema.safeParse({
      ...BASE,
      workflowId: WF_ID,
      status: "running",
    });
    expect(result.success).toBe(false);
  });
});

describe("workflow.commands – DeleteWorkflowCommandSchema", () => {
  it("accepts valid delete command", () => {
    const result = DeleteWorkflowCommandSchema.safeParse({ ...BASE, workflowId: WF_ID });
    expect(result.success).toBe(true);
  });
});

describe("workflow.commands – ExecuteWorkflowCommandSchema", () => {
  it("accepts a valid execute command", () => {
    const result = ExecuteWorkflowCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      orgId: ORG_ID,
      workflowId: WF_ID,
      triggerPayload: { taskId: "some-task" },
    });
    expect(result.success).toBe(true);
  });
});

describe("workflow.commands – CloneWorkflowCommandSchema", () => {
  it("accepts a valid clone command", () => {
    const result = CloneWorkflowCommandSchema.safeParse({
      ...BASE,
      sourceWorkflowId: WF_ID,
      newName: "Cloned Workflow",
    });
    expect(result.success).toBe(true);
  });
});

describe("workflow.commands – BulkChangeWorkflowStatusCommandSchema", () => {
  it("accepts valid bulk status change", () => {
    const result = BulkChangeWorkflowStatusCommandSchema.safeParse({
      ...BASE,
      workflowIds: [WF_ID, "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee"],
      status: "paused",
    });
    expect(result.success).toBe(true);
  });

  it("rejects duplicate workflowIds", () => {
    const result = BulkChangeWorkflowStatusCommandSchema.safeParse({
      ...BASE,
      workflowIds: [WF_ID, WF_ID],
      status: "paused",
    });
    expect(result.success).toBe(false);
  });
});

describe("workflow.commands – BulkExecuteWorkflowsCommandSchema", () => {
  it("accepts valid bulk execute command", () => {
    const result = BulkExecuteWorkflowsCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      orgId: ORG_ID,
      workflowIds: [WF_ID, "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee"],
      triggerPayload: { taskId: "some-task" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects duplicate workflowIds", () => {
    const result = BulkExecuteWorkflowsCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      orgId: ORG_ID,
      workflowIds: [WF_ID, WF_ID],
      triggerPayload: { taskId: "some-task" },
    });
    expect(result.success).toBe(false);
  });
});
