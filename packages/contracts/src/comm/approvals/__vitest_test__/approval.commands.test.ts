import { describe, expect, it } from "vitest";
import {
  ListApprovalDelegationsQuerySchema,
  ListApprovalRequestsQuerySchema,
  SearchApprovalRequestsQuerySchema,
} from "../approval.queries";

describe("approval.commands queries", () => {
  it("rejects list requests when dueBefore is earlier than dueAfter", () => {
    const result = ListApprovalRequestsQuerySchema.safeParse({
      dueAfter: "2026-03-10",
      dueBefore: "2026-03-01",
      limit: 10,
    });

    expect(result.success).toBe(false);
  });

  it("applies default search limit", () => {
    const parsed = SearchApprovalRequestsQuerySchema.parse({
      query: "urgent invoice",
    });

    expect(parsed.limit).toBe(20);
  });

  it("requires at least one delegation filter", () => {
    const result = ListApprovalDelegationsQuerySchema.safeParse({
      limit: 50,
    });

    expect(result.success).toBe(false);
  });

  it("accepts delegation list query with one filter", () => {
    const parsed = ListApprovalDelegationsQuerySchema.parse({
      activeOnDate: "2026-03-13",
      limit: 50,
    });

    expect(parsed.activeOnDate).toBe("2026-03-13");
  });
});
