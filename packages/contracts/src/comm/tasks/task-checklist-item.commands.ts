import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { CommTaskIdSchema, TaskChecklistItemIdSchema } from "../../shared/ids.js";

// ─── Reusable Field Schema ────────────────────────────────────────────────────

const ChecklistItemSchema = z.string().trim().min(1).max(500);

// ─── Mutation Input Schemas ───────────────────────────────────────────────────
// Used for client-side validation before wrapping in a command (no idempotency key).

/** Shape of a single item being created — server assigns id, orgId, isChecked, checkedAt, timestamps. */
export const TaskChecklistItemCreateSchema = z.object({
  text: ChecklistItemSchema,
  /** If omitted, the server appends the item at the end of the list. */
  sortOrder: z.number().int().min(0).optional(),
});

/** Partial update for a single checklist item's mutable fields. */
export const TaskChecklistItemUpdateSchema = z
  .object({
    checklistItemId: TaskChecklistItemIdSchema,
    text: ChecklistItemSchema.optional(),
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
  items: z.array(ChecklistItemSchema).min(1).max(100),
}).superRefine((data, ctx) => {
  const uniqueItems = new Set(data.items);
  if (uniqueItems.size !== data.items.length) {
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
  orderedItemIds: z.array(TaskChecklistItemIdSchema).min(1),
}).superRefine((data, ctx) => {
  const uniqueIds = new Set(data.orderedItemIds);
  if (uniqueIds.size !== data.orderedItemIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "orderedItemIds must not contain duplicates.",
      path: ["orderedItemIds"],
    });
  }
});

export const BulkUpdateTaskChecklistCommandSchema = ChecklistCommandBase.extend({
  taskId: CommTaskIdSchema,
  /** Each entry updates one checklist item. At most 100 items per batch. */
  updates: z.array(TaskChecklistItemUpdateSchema).min(1).max(100),
}).superRefine((data, ctx) => {
  const ids = data.updates.map((u) => u.checklistItemId);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate checklistItemId values are not allowed in bulk updates.",
      path: ["updates"],
    });
  }
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
  const ids = data.toggles.map((t) => t.checklistItemId);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate checklistItemId values are not allowed in bulk toggles.",
      path: ["toggles"],
    });
  }
});

export const BulkRemoveTaskChecklistItemsCommandSchema = ChecklistCommandBase.extend({
  taskId: CommTaskIdSchema,
  checklistItemIds: z.array(TaskChecklistItemIdSchema).min(1).max(100),
}).superRefine((data, ctx) => {
  const uniqueIds = new Set(data.checklistItemIds);
  if (uniqueIds.size !== data.checklistItemIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate checklistItemId values are not allowed in bulk removals.",
      path: ["checklistItemIds"],
    });
  }
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
