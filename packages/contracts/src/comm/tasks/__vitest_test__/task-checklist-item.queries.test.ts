import { describe, expect, it } from "vitest";
import {
  ListTaskChecklistItemsQuerySchema,
  SearchTaskChecklistItemsQuerySchema,
} from "../task-checklist-item.queries.js";

describe("task-checklist-item.queries", () => {
  it("applies default sortBy", () => {
    const parsed = ListTaskChecklistItemsQuerySchema.parse({
      taskId: "22222222-2222-4222-8222-222222222222",
    });

    expect(parsed.sortBy).toBe("sortOrder");
  });

  it("rejects mutually exclusive flags and parses search query", () => {
    const invalid = ListTaskChecklistItemsQuerySchema.safeParse({
      taskId: "22222222-2222-4222-8222-222222222222",
      onlyChecked: true,
      onlyUnchecked: true,
    });

    expect(invalid.success).toBe(false);

    const search = SearchTaskChecklistItemsQuerySchema.safeParse({
      taskId: "22222222-2222-4222-8222-222222222222",
      query: "finance",
    });

    expect(search.success).toBe(true);
  });
});
