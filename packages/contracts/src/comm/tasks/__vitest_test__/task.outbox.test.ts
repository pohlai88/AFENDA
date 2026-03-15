import { describe, expect, it } from "vitest";
import { OutboxRecordSchema, TaskOutboxRecordSchema } from "../task.outbox.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const TASK_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const SUB_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";

describe("task.outbox", () => {
  it("accepts generic outbox record", () => {
    const result = OutboxRecordSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      eventName: "COMM.SOMETHING",
      payload: { ok: true },
      createdAt: "2026-06-01T10:00:00.000Z",
      processedAt: null,
    });

    expect(result.success).toBe(true);
  });

  it("accepts COMM.TASK_CREATED record", () => {
    const result = TaskOutboxRecordSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      eventName: "COMM.TASK_CREATED",
      createdAt: "2026-06-01T10:00:00.000Z",
      payload: {
        taskId: TASK_ID,
        orgId: ORG_ID,
        taskNumber: "TASK-001",
        title: "Fix login",
        status: "open",
        priority: "high",
        taskType: "bug",
        reporterId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts COMM.TASK_STATUS_CHANGED record", () => {
    const result = TaskOutboxRecordSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      eventName: "COMM.TASK_STATUS_CHANGED",
      createdAt: "2026-06-01T10:00:00.000Z",
      payload: {
        taskId: TASK_ID,
        orgId: ORG_ID,
        fromStatus: "open",
        toStatus: "in_progress",
        changedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts COMM.TASK_CHECKLIST_ITEM_ADDED record", () => {
    const result = TaskOutboxRecordSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      eventName: "COMM.TASK_CHECKLIST_ITEM_ADDED",
      createdAt: "2026-06-01T10:00:00.000Z",
      payload: {
        taskId: TASK_ID,
        orgId: ORG_ID,
        checklistItemId: SUB_ID,
        text: "Step one",
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts COMM.TASK_TIME_ENTRY_CREATED record", () => {
    const result = TaskOutboxRecordSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      eventName: "COMM.TASK_TIME_ENTRY_CREATED",
      createdAt: "2026-06-01T10:00:00.000Z",
      payload: {
        taskId: TASK_ID,
        orgId: ORG_ID,
        timeEntryId: SUB_ID,
        principalId: PRINCIPAL_ID,
        minutes: 90,
        entryDate: "2026-06-15",
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts COMM.TASK_WATCHER_ADDED record", () => {
    const result = TaskOutboxRecordSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      eventName: "COMM.TASK_WATCHER_ADDED",
      createdAt: "2026-06-01T10:00:00.000Z",
      payload: {
        taskId: TASK_ID,
        orgId: ORG_ID,
        watcherId: SUB_ID,
        principalId: PRINCIPAL_ID,
        addedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts COMM.TASK_WATCHER_REMOVED record", () => {
    const result = TaskOutboxRecordSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      eventName: "COMM.TASK_WATCHER_REMOVED",
      createdAt: "2026-06-01T10:00:00.000Z",
      payload: {
        taskId: TASK_ID,
        orgId: ORG_ID,
        principalId: PRINCIPAL_ID,
        removedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts COMM.TASK_DELETED record", () => {
    const result = TaskOutboxRecordSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      eventName: "COMM.TASK_DELETED",
      createdAt: "2026-06-01T10:00:00.000Z",
      payload: {
        taskId: TASK_ID,
        orgId: ORG_ID,
        deletedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown event type", () => {
    const result = TaskOutboxRecordSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      eventName: "COMM.TASK_UNKNOWN",
      createdAt: "2026-06-01T10:00:00.000Z",
      payload: { taskId: TASK_ID, orgId: ORG_ID, correlationId: CORR_ID },
    });
    expect(result.success).toBe(false);
  });
});
