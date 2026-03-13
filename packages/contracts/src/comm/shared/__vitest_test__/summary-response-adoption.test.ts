import { describe, expect, it } from "vitest";
import {
  SummarizeTaskTimeEntriesResponseSchema,
  SummarizeTaskWatchersResponseSchema,
} from "../../tasks/index.js";
import {
  SummarizeWorkflowRunsResponseSchema,
  SummarizeWorkflowsResponseSchema,
} from "../../workflows/index.js";

describe("summary response envelope adoption", () => {
  it("parses task summary response envelopes", () => {
    const taskTimeSummary = SummarizeTaskTimeEntriesResponseSchema.parse({
      data: {
        totalCount: 2,
        totalMinutes: 75,
        groups: [{ key: "task", count: 2, totalMinutes: 75 }],
      },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    const watcherSummary = SummarizeTaskWatchersResponseSchema.parse({
      data: {
        totalCount: 3,
        groups: [{ key: "principal", count: 3 }],
      },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    expect(taskTimeSummary.data.totalMinutes).toBe(75);
    expect(watcherSummary.data.groups[0]?.key).toBe("principal");
  });

  it("parses workflow summary response envelopes", () => {
    const workflowSummary = SummarizeWorkflowsResponseSchema.parse({
      data: {
        totalCount: 2,
        groups: [{ key: "active", count: 2 }],
      },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    const runSummary = SummarizeWorkflowRunsResponseSchema.parse({
      data: {
        totalCount: 4,
        groups: [{ key: "completed", count: 4 }],
      },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    expect(workflowSummary.data.totalCount).toBe(2);
    expect(runSummary.data.groups).toHaveLength(1);
  });
});
