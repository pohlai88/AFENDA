import { describe, expect, it } from "vitest";
import {
  ListTaskTimeEntriesQuerySchema,
  SummarizeOrgTimeEntriesQuerySchema,
  SummarizeTaskTimeEntriesQuerySchema,
} from "../task-time-entry.queries.js";

describe("task-time-entry.queries", () => {
  it("applies default limit", () => {
    const parsed = ListTaskTimeEntriesQuerySchema.parse({
      taskId: "22222222-2222-4222-8222-222222222222",
    });

    expect(parsed.limit).toBe(50);
  });

  it("rejects reversed date ranges", () => {
    const taskSummary = SummarizeTaskTimeEntriesQuerySchema.safeParse({
      fromDate: "2026-06-10",
      toDate: "2026-06-01",
    });
    const orgSummary = SummarizeOrgTimeEntriesQuerySchema.safeParse({
      fromDate: "2026-06-10",
      toDate: "2026-06-01",
    });

    expect(taskSummary.success).toBe(false);
    expect(orgSummary.success).toBe(false);
  });
});
