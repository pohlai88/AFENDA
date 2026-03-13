import { describe, expect, it } from "vitest";
import { ListTaskChecklistItemsQuerySchema } from "../task-checklist-item.queries.js";
import {
  ListTaskTimeEntriesQuerySchema,
  SummarizeOrgTimeEntriesResponseSchema,
  SummarizeTaskTimeEntriesResponseSchema,
} from "../task-time-entry.queries.js";
import { SummarizeTaskWatchersResponseSchema } from "../task-watcher.queries.js";
import {
  ListTasksQuerySchema,
  SearchTasksQuerySchema,
  SummarizeTasksResponseSchema,
} from "../task.queries.js";

describe("task.queries", () => {
  it("rejects task list query when dueBefore is earlier than dueAfter", () => {
    const result = ListTasksQuerySchema.safeParse({
      dueAfter: "2026-07-10",
      dueBefore: "2026-07-01",
      limit: 10,
    });

    expect(result.success).toBe(false);
  });

  it("rejects checklist query when onlyChecked and onlyUnchecked are both true", () => {
    const result = ListTaskChecklistItemsQuerySchema.safeParse({
      taskId: "11111111-1111-4111-8111-111111111111",
      onlyChecked: true,
      onlyUnchecked: true,
    });

    expect(result.success).toBe(false);
  });

  it("applies search/list defaults", () => {
    const search = SearchTasksQuerySchema.parse({ query: "overdue" });
    const timeEntries = ListTaskTimeEntriesQuerySchema.parse({
      taskId: "11111111-1111-4111-8111-111111111111",
    });

    expect(search.limit).toBe(20);
    expect(timeEntries.limit).toBe(50);
  });

  it("accepts standardized summary response envelopes", () => {
    const tasksSummary = SummarizeTasksResponseSchema.parse({
      data: {
        totalCount: 3,
        groups: [{ key: "open", count: 2 }],
      },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    const timeSummary = SummarizeTaskTimeEntriesResponseSchema.parse({
      data: {
        totalCount: 4,
        totalMinutes: 180,
        groups: [{ key: "task", count: 4, totalMinutes: 180 }],
      },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    const orgTimeSummary = SummarizeOrgTimeEntriesResponseSchema.parse({
      data: {
        totalCount: 2,
        totalMinutes: 90,
        groups: [{ key: "principal", count: 2, totalMinutes: 90 }],
      },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    const watcherSummary = SummarizeTaskWatchersResponseSchema.parse({
      data: {
        totalCount: 5,
        groups: [{ key: "task", count: 5 }],
      },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    expect(tasksSummary.data.totalCount).toBe(3);
    expect(timeSummary.data.totalMinutes).toBe(180);
    expect(orgTimeSummary.data.totalMinutes).toBe(90);
    expect(watcherSummary.data.totalCount).toBe(5);
  });
});
