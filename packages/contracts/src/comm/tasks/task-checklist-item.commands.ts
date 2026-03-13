import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { CommTaskIdSchema } from "./task.entity.js";
import { TaskChecklistItemIdSchema } from "./task-checklist-item.entity.js";

export const AddTaskChecklistCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  taskId: CommTaskIdSchema,
  items: z.array(z.string().trim().min(1).max(500)).min(1).max(100),
});

export const ToggleTaskChecklistItemCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  taskId: CommTaskIdSchema,
  checklistItemId: TaskChecklistItemIdSchema,
  checked: z.boolean(),
});

export const RemoveTaskChecklistItemCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  taskId: CommTaskIdSchema,
  checklistItemId: TaskChecklistItemIdSchema,
});

export type AddTaskChecklistCommand = z.infer<typeof AddTaskChecklistCommandSchema>;
export type ToggleTaskChecklistItemCommand = z.infer<typeof ToggleTaskChecklistItemCommandSchema>;
export type RemoveTaskChecklistItemCommand = z.infer<typeof RemoveTaskChecklistItemCommandSchema>;
