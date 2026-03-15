import { describe, expect, it } from "vitest";
import { TaskTimeEntrySchema } from "../task-time-entry.entity.js";

describe("task-time-entry.entity", () => {
  it("parses valid time entry", () => {
    const result = TaskTimeEntrySchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      taskId: "22222222-2222-4222-8222-222222222222",
      principalId: "33333333-3333-4333-8333-333333333333",
      minutes: 90,
      entryDate: "2026-06-01",
      description: null,
      createdAt: "2026-06-01T09:00:00.000Z",
      updatedAt: "2026-06-01T09:30:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects non-positive minutes", () => {
    const result = TaskTimeEntrySchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      taskId: "22222222-2222-4222-8222-222222222222",
      principalId: "33333333-3333-4333-8333-333333333333",
      minutes: 0,
      entryDate: "2026-06-01",
      description: null,
      createdAt: "2026-06-01T09:00:00.000Z",
      updatedAt: "2026-06-01T09:30:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
