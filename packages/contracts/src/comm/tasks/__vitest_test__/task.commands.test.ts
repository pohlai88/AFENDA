import { describe, expect, it } from "vitest";
import {
  BulkAssignTasksCommandSchema,
  CreateTaskCommandSchema,
  UpdateTaskCommandSchema,
} from "../task.commands.js";

const IDEMPOTENCY_KEY = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const TASK_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const ENTITY_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";

describe("task.commands – CreateTaskCommandSchema", () => {
  it("accepts valid create payload", () => {
    const result = CreateTaskCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      title: "Fix auth edge case",
      startDate: "2026-04-01",
      dueDate: "2026-04-10",
      contextEntityType: "project",
      contextEntityId: ENTITY_ID,
    });

    expect(result.success).toBe(true);
  });

  it("rejects create payload when context pair is partial", () => {
    const result = CreateTaskCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      title: "Fix auth edge case",
      contextEntityType: "project",
    });

    expect(result.success).toBe(false);
  });
});

describe("task.commands – UpdateTaskCommandSchema", () => {
  it("rejects empty update payload", () => {
    const result = UpdateTaskCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      taskId: TASK_ID,
    });

    expect(result.success).toBe(false);
  });

  it("rejects update payload with invalid date order", () => {
    const result = UpdateTaskCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      taskId: TASK_ID,
      startDate: "2026-05-10",
      dueDate: "2026-05-01",
    });

    expect(result.success).toBe(false);
  });
});

describe("task.commands – BulkAssignTasksCommandSchema", () => {
  it("rejects duplicate task IDs", () => {
    const result = BulkAssignTasksCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      taskIds: [TASK_ID, TASK_ID],
      assigneeId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    });

    expect(result.success).toBe(false);
  });
});
