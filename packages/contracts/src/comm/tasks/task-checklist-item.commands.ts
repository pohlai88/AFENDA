import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { CommTaskIdSchema, TaskChecklistItemIdSchema } from "../../shared/ids.js";
import { TaskChecklistItemTextSchema } from "./task-checklist-item.shared.js";

const ChecklistItemIdsSchema = z.array(TaskChecklistItemIdSchema).min(1).max(100);

function addDuplicateIdIssue(
  ids: readonly string[],
  path: string,
  message: string,
  ctx: z.RefinementCtx,
) {
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: [path],
    });
  }
}

// ─── Mutation Input Schemas ───────────────────────────────────────────────────
// Used for client-side validation before wrapping in a command (no idempotency key).

/** Shape of a single item being created — server assigns id, orgId, isChecked, checkedAt, timestamps. */
export const TaskChecklistItemCreateSchema = z.object({
  text: TaskChecklistItemTextSchema,
  /** If omitted, the server appends the item at the end of the list. */
  sortOrder: z.number().int().min(0).optional(),
});

/** Partial update for a single checklist item's mutable fields. */
export const TaskChecklistItemUpdateSchema = z
  .object({
    checklistItemId: TaskChecklistItemIdSchema,
    text: TaskChecklistItemTextSchema.optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.text === undefined && data.sortOrder === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of text or sortOrder must be provided.",
        path: [],
      });
    }
  });

// ─── Base Command Schema ──────────────────────────────────────────────────────

const ChecklistCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

// ─── Commands ─────────────────────────────────────────────────────────────────

export const AddTaskChecklistCommandSchema = ChecklistCommandBase.extend({
  taskId: CommTaskIdSchema,
  items: z.array(TaskChecklistItemTextSchema).min(1).max(100),
}).superRefine((data, ctx) => {
  if (new Set(data.items).size !== data.items.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate checklist items are not allowed.",
      path: ["items"],
    });
  }
});

export const ToggleTaskChecklistItemCommandSchema = ChecklistCommandBase.extend({
  taskId: CommTaskIdSchema,
  checklistItemId: TaskChecklistItemIdSchema,
  checked: z.boolean(),
});

export const RemoveTaskChecklistItemCommandSchema = ChecklistCommandBase.extend({
  taskId: CommTaskIdSchema,
  checklistItemId: TaskChecklistItemIdSchema,
});

export const ReorderTaskChecklistCommandSchema = ChecklistCommandBase.extend({
  taskId: CommTaskIdSchema,
  /** Ordered list of all checklist item IDs for the task, representing the desired sequence. */
  orderedItemIds: ChecklistItemIdsSchema,
}).superRefine((data, ctx) => {
  addDuplicateIdIssue(
    data.orderedItemIds,
    "orderedItemIds",
    "orderedItemIds must not contain duplicates.",
    ctx,
  );
});

export const BulkUpdateTaskChecklistCommandSchema = ChecklistCommandBase.extend({
  taskId: CommTaskIdSchema,
  /** Each entry updates one checklist item. At most 100 items per batch. */
  updates: z.array(TaskChecklistItemUpdateSchema).min(1).max(100),
}).superRefine((data, ctx) => {
  addDuplicateIdIssue(
    data.updates.map((u) => u.checklistItemId),
    "updates",
    "Duplicate checklistItemId values are not allowed in bulk updates.",
    ctx,
  );
});

export const BulkToggleTaskChecklistItemsCommandSchema = ChecklistCommandBase.extend({
  taskId: CommTaskIdSchema,
  toggles: z
    .array(
      z.object({
        checklistItemId: TaskChecklistItemIdSchema,
        checked: z.boolean(),
      }),
    )
    .min(1)
    .max(100),
}).superRefine((data, ctx) => {
  addDuplicateIdIssue(
    data.toggles.map((t) => t.checklistItemId),
    "toggles",
    "Duplicate checklistItemId values are not allowed in bulk toggles.",
    ctx,
  );
});

export const BulkRemoveTaskChecklistItemsCommandSchema = ChecklistCommandBase.extend({
  taskId: CommTaskIdSchema,
  checklistItemIds: ChecklistItemIdsSchema,
}).superRefine((data, ctx) => {
  addDuplicateIdIssue(
    data.checklistItemIds,
    "checklistItemIds",
    "Duplicate checklistItemId values are not allowed in bulk removals.",
    ctx,
  );
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddTaskChecklistCommand = z.infer<typeof AddTaskChecklistCommandSchema>;
export type ToggleTaskChecklistItemCommand = z.infer<typeof ToggleTaskChecklistItemCommandSchema>;
export type RemoveTaskChecklistItemCommand = z.infer<typeof RemoveTaskChecklistItemCommandSchema>;
export type ReorderTaskChecklistCommand = z.infer<typeof ReorderTaskChecklistCommandSchema>;
export type BulkUpdateTaskChecklistCommand = z.infer<typeof BulkUpdateTaskChecklistCommandSchema>;
export type BulkToggleTaskChecklistItemsCommand = z.infer<
  typeof BulkToggleTaskChecklistItemsCommandSchema
>;
export type BulkRemoveTaskChecklistItemsCommand = z.infer<
  typeof BulkRemoveTaskChecklistItemsCommandSchema
>;
export type TaskChecklistItemCreate = z.infer<typeof TaskChecklistItemCreateSchema>;
export type TaskChecklistItemUpdate = z.infer<typeof TaskChecklistItemUpdateSchema>;
