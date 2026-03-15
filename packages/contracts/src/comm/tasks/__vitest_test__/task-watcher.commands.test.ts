import { describe, expect, it } from "vitest";
import {
  BulkAddTaskWatchersCommandSchema,
  BulkRemoveTaskWatchersCommandSchema,
} from "../task-watcher.commands.js";

const IDEMPOTENCY_KEY = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const TASK_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const PRINCIPAL_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const WATCHER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("task-watcher.commands", () => {
  it("rejects duplicate principal IDs in bulk add", () => {
    const result = BulkAddTaskWatchersCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      taskId: TASK_ID,
      principalIds: [PRINCIPAL_ID, PRINCIPAL_ID],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate watcher IDs in bulk remove", () => {
    const result = BulkRemoveTaskWatchersCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      taskId: TASK_ID,
      watcherIds: [WATCHER_ID, WATCHER_ID],
    });
    expect(result.success).toBe(false);
  });
});
