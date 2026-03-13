import { describe, expect, it } from "vitest";
import {
  ListProjectMembersQuerySchema,
  ListProjectsQuerySchema,
  SearchProjectsQuerySchema,
} from "../project.queries.js";

describe("project.queries", () => {
  it("rejects list query when targetBefore is earlier than targetAfter", () => {
    const result = ListProjectsQuerySchema.safeParse({
      targetAfter: "2026-04-01",
      targetBefore: "2026-03-01",
      limit: 25,
    });

    expect(result.success).toBe(false);
  });

  it("applies default search limit", () => {
    const parsed = SearchProjectsQuerySchema.parse({
      query: "migration",
    });

    expect(parsed.limit).toBe(20);
  });

  it("accepts member list query and defaults list limit", () => {
    const parsed = ListProjectMembersQuerySchema.parse({
      projectId: "11111111-1111-4111-8111-111111111111",
    });

    expect(parsed.limit).toBe(50);
  });
});
