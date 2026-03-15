import { describe, expect, it } from "vitest";
import {
  AddTaskChecklistCommandSchema,
  BulkUpdateTaskChecklistCommandSchema,
  TaskChecklistItemUpdateSchema,
} from "../task-checklist-item.commands.js";

const IDEMPOTENCY_KEY = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const TASK_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const ITEM_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";

describe("task-checklist-item.commands", () => {
  it("accepts add checklist command", () => {
    const result = AddTaskChecklistCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      taskId: TASK_ID,
      items: ["Write tests", "Ship release"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects duplicate checklist items", () => {
    const result = AddTaskChecklistCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      taskId: TASK_ID,
      items: ["Repeat", "Repeat"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects update schema with no mutable fields", () => {
    const result = TaskChecklistItemUpdateSchema.safeParse({
      checklistItemId: ITEM_ID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate checklist item IDs in bulk update", () => {
    const result = BulkUpdateTaskChecklistCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      taskId: TASK_ID,
      updates: [
        { checklistItemId: ITEM_ID, text: "A" },
        { checklistItemId: ITEM_ID, sortOrder: 1 },
      ],
    });
    expect(result.success).toBe(false);
  });
});
