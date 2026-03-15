import { describe, expect, it } from "vitest";
import { TaskWatcherSchema } from "../task-watcher.entity.js";

describe("task-watcher.entity", () => {
  it("parses valid task watcher", () => {
    const result = TaskWatcherSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      taskId: "22222222-2222-4222-8222-222222222222",
      principalId: "33333333-3333-4333-8333-333333333333",
      createdAt: "2026-06-01T09:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid principal id", () => {
    const result = TaskWatcherSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      taskId: "22222222-2222-4222-8222-222222222222",
      principalId: "not-a-uuid",
      createdAt: "2026-06-01T09:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
