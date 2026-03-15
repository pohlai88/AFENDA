import { describe, expect, it } from "vitest";
import {
  LogTaskTimeEntryCommandSchema,
  UpdateTaskTimeEntryCommandSchema,
} from "../task-time-entry.commands.js";

const IDEMPOTENCY_KEY = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const TASK_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const TIME_ENTRY_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";

describe("task-time-entry.commands", () => {
  it("accepts log command", () => {
    const result = LogTaskTimeEntryCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      taskId: TASK_ID,
      minutes: 45,
      entryDate: "2026-05-10",
      description: "Refactoring",
    });
    expect(result.success).toBe(true);
  });

  it("rejects update command with no mutable fields", () => {
    const result = UpdateTaskTimeEntryCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      timeEntryId: TIME_ENTRY_ID,
    });
    expect(result.success).toBe(false);
  });
});
