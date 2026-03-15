import { describe, expect, it } from "vitest";
import {
  TaskSchema,
  TaskStatusValues,
  TaskPriorityValues,
  TaskTypeValues,
} from "../task.entity.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const TASK_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";

const NOW = new Date().toISOString();

const minimalTask = {
  id: TASK_ID,
  orgId: ORG_ID,
  projectId: null,
  parentTaskId: null,
  taskNumber: "TASK-001",
  title: "Fix login bug",
  description: null,
  status: "open",
  priority: "high",
  taskType: "bug",
  assigneeId: null,
  reporterId: PRINCIPAL_ID,
  dueDate: null,
  startDate: null,
  estimateMinutes: null,
  actualMinutes: null,
  completedAt: null,
  completedByPrincipalId: null,
  sortOrder: 0,
  contextEntityType: null,
  contextEntityId: null,
  slaBreachAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

describe("task.entity", () => {
  it("parses a minimal task", () => {
    const result = TaskSchema.safeParse(minimalTask);
    expect(result.success).toBe(true);
  });

  it("exposes correct status values", () => {
    expect(TaskStatusValues).toContain("draft");
    expect(TaskStatusValues).toContain("open");
    expect(TaskStatusValues).toContain("in_progress");
    expect(TaskStatusValues).toContain("review");
    expect(TaskStatusValues).toContain("blocked");
    expect(TaskStatusValues).toContain("done");
    expect(TaskStatusValues).toContain("cancelled");
    expect(TaskStatusValues).toContain("archived");
    expect(TaskStatusValues).toHaveLength(8);
  });

  it("exposes correct priority values", () => {
    expect(TaskPriorityValues).toContain("critical");
    expect(TaskPriorityValues).toContain("high");
    expect(TaskPriorityValues).toContain("medium");
    expect(TaskPriorityValues).toContain("low");
    expect(TaskPriorityValues).toContain("none");
    expect(TaskPriorityValues).toHaveLength(5);
  });

  it("exposes correct task type values", () => {
    expect(TaskTypeValues).toContain("task");
    expect(TaskTypeValues).toContain("bug");
    expect(TaskTypeValues).toContain("feature");
    expect(TaskTypeValues).toContain("improvement");
    expect(TaskTypeValues).toContain("question");
    expect(TaskTypeValues).toHaveLength(5);
  });

  it("rejects invalid status", () => {
    const result = TaskSchema.safeParse({ ...minimalTask, status: "pending" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority", () => {
    const result = TaskSchema.safeParse({ ...minimalTask, priority: "urgent" });
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding max length", () => {
    const result = TaskSchema.safeParse({ ...minimalTask, title: "x".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("accepts task with optional fields populated", () => {
    const result = TaskSchema.safeParse({
      ...minimalTask,
      projectId: TASK_ID,
      assigneeId: PRINCIPAL_ID,
      dueDate: "2026-12-31",
      estimateMinutes: 120,
      actualMinutes: 30,
    });
    expect(result.success).toBe(true);
  });
});
