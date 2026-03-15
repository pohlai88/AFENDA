import { describe, expect, it } from "vitest";
import {
  GetTaskChecklistItemResponseSchema,
  ListTaskChecklistItemsResponseSchema,
} from "../task-checklist-item.queries.js";
import {
  GetTaskTimeEntryResponseSchema,
  ListTaskTimeEntriesResponseSchema,
} from "../task-time-entry.queries.js";
import {
  GetTaskWatcherResponseSchema,
  ListTaskWatchersResponseSchema,
} from "../task-watcher.queries.js";
import {
  GetTaskResponseSchema,
  ListTasksResponseSchema,
} from "../task.queries.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const TASK_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const ITEM_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";
const now = new Date().toISOString();

const baseTask = {
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
  createdAt: now,
  updatedAt: now,
};

describe("task.queries.detail", () => {
  it("parses GetTaskResponseSchema with correlationId", () => {
    const result = GetTaskResponseSchema.safeParse({
      data: baseTask,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.correlationId).toBe(CORR_ID);
    }
  });

  it("rejects GetTaskResponseSchema missing correlationId", () => {
    const result = GetTaskResponseSchema.safeParse({ data: baseTask });
    expect(result.success).toBe(false);
  });

  it("parses ListTasksResponseSchema with cursor/hasMore/limit", () => {
    const result = ListTasksResponseSchema.safeParse({
      data: [baseTask],
      meta: { cursor: null, hasMore: false, limit: 25 },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.meta.cursor).toBeNull();
      expect(result.data.meta.hasMore).toBe(false);
    }
  });

  it("parses GetTaskChecklistItemResponseSchema", () => {
    const result = GetTaskChecklistItemResponseSchema.safeParse({
      data: {
        id: ITEM_ID,
        orgId: ORG_ID,
        taskId: TASK_ID,
        text: "Step one",
        isChecked: false,
        checkedAt: null,
        checkedByPrincipalId: null,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses ListTaskChecklistItemsResponseSchema", () => {
    const result = ListTaskChecklistItemsResponseSchema.safeParse({
      data: [],
      meta: { cursor: null, hasMore: false, limit: 50 },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses GetTaskTimeEntryResponseSchema", () => {
    const result = GetTaskTimeEntryResponseSchema.safeParse({
      data: {
        id: ITEM_ID,
        orgId: ORG_ID,
        taskId: TASK_ID,
        principalId: PRINCIPAL_ID,
        minutes: 60,
        entryDate: "2026-06-15",
        description: null,
        createdAt: now,
        updatedAt: now,
      },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses ListTaskTimeEntriesResponseSchema", () => {
    const result = ListTaskTimeEntriesResponseSchema.safeParse({
      data: [],
      meta: { cursor: null, hasMore: false, limit: 50 },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses GetTaskWatcherResponseSchema", () => {
    const result = GetTaskWatcherResponseSchema.safeParse({
      data: {
        id: ITEM_ID,
        orgId: ORG_ID,
        taskId: TASK_ID,
        principalId: PRINCIPAL_ID,
        createdAt: now,
      },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses ListTaskWatchersResponseSchema", () => {
    const result = ListTaskWatchersResponseSchema.safeParse({
      data: [],
      meta: { cursor: null, hasMore: false, limit: 50 },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});
