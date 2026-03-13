import { describe, expect, it } from "vitest";
import {
  ListWorkflowRunsQuerySchema,
  ListWorkflowsQuerySchema,
  SummarizeWorkflowRunsResponseSchema,
  SummarizeWorkflowRunsQuerySchema,
  SummarizeWorkflowsResponseSchema,
} from "../workflow.queries.js";

describe("workflow.queries", () => {
  it("rejects workflow runs list query when fromDate is after toDate", () => {
    const result = ListWorkflowRunsQuerySchema.safeParse({
      orgId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      fromDate: "2026-08-20",
      toDate: "2026-08-10",
      limit: 10,
    });

    expect(result.success).toBe(false);
  });

  it("rejects workflow runs summary query when fromDate is after toDate", () => {
    const result = SummarizeWorkflowRunsQuerySchema.safeParse({
      orgId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      fromDate: "2026-08-20",
      toDate: "2026-08-10",
    });

    expect(result.success).toBe(false);
  });

  it("applies default list limit for workflows", () => {
    const parsed = ListWorkflowsQuerySchema.parse({
      orgId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    expect(parsed.limit).toBe(50);
  });

  it("accepts standardized summary response envelopes", () => {
    const workflowSummary = SummarizeWorkflowsResponseSchema.parse({
      data: {
        totalCount: 2,
        groups: [{ key: "active", count: 2 }],
      },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    const runSummary = SummarizeWorkflowRunsResponseSchema.parse({
      data: {
        totalCount: 10,
        groups: [
          { key: "completed", count: 9 },
          { key: "failed", count: 1 },
        ],
      },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    expect(workflowSummary.data.totalCount).toBe(2);
    expect(runSummary.data.groups).toHaveLength(2);
  });
});
