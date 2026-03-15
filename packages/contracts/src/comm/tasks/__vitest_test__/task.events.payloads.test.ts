import { describe, expect, it } from "vitest";
import {
  TaskCreatedEventSchema,
  TaskUpdatedEventSchema,
  TaskAssignedEventSchema,
  TaskStatusChangedEventSchema,
  TaskCompletedEventSchema,
  TaskArchivedEventSchema,
  TaskDeletedEventSchema,
} from "../task.events.payloads.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const TASK_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";

describe("task.events.payloads", () => {
  it("parses TaskCreatedEventSchema", () => {
    const result = TaskCreatedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      taskNumber: "TASK-001",
      title: "Fix login bug",
      status: "open",
      priority: "high",
      taskType: "bug",
      reporterId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects TaskCreatedEventSchema with invalid status", () => {
    const result = TaskCreatedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      taskNumber: "TASK-001",
      title: "Fix login bug",
      status: "pending",
      priority: "high",
      taskType: "bug",
      reporterId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });

  it("parses TaskUpdatedEventSchema", () => {
    const result = TaskUpdatedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      updatedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses TaskAssignedEventSchema with null assigneeId", () => {
    const result = TaskAssignedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      assigneeId: null,
      assignedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses TaskAssignedEventSchema with assigneeId set", () => {
    const result = TaskAssignedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      assigneeId: PRINCIPAL_ID,
      assignedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses TaskStatusChangedEventSchema", () => {
    const result = TaskStatusChangedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      fromStatus: "open",
      toStatus: "in_progress",
      changedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses TaskCompletedEventSchema", () => {
    const result = TaskCompletedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      completedAt: new Date().toISOString(),
      completedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses TaskArchivedEventSchema", () => {
    const result = TaskArchivedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      archivedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses TaskDeletedEventSchema", () => {
    const result = TaskDeletedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      deletedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});
