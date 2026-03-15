import { describe, expect, it } from "vitest";
import {
  ListTaskWatchersQuerySchema,
  SummarizeTaskWatchersDataSchema,
  SummarizeTaskWatchersQuerySchema,
} from "../task-watcher.queries.js";

describe("task-watcher.queries", () => {
  it("parses list query and optional summary query", () => {
    expect(
      ListTaskWatchersQuerySchema.safeParse({
        taskId: "22222222-2222-4222-8222-222222222222",
      }).success,
    ).toBe(true);

    expect(
      SummarizeTaskWatchersQuerySchema.safeParse({
        groupBy: "principal",
      }).success,
    ).toBe(true);
  });

  it("parses watcher summary data", () => {
    const parsed = SummarizeTaskWatchersDataSchema.parse({
      totalCount: 2,
      groups: [
        {
          key: "principal:33333333-3333-4333-8333-333333333333",
          count: 2,
        },
      ],
    });

    expect(parsed.totalCount).toBe(2);
  });
});
