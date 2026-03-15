import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { CommTaskIdSchema, PrincipalIdSchema, TaskWatcherIdSchema } from "../../shared/ids.js";

function addDuplicateValuesIssue(
  values: readonly string[],
  path: string,
  message: string,
  ctx: z.RefinementCtx,
) {
  if (new Set(values).size !== values.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: [path],
    });
  }
}

// ─── Base Command Schema ──────────────────────────────────────────────────────

const WatcherCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

// ─── Commands ─────────────────────────────────────────────────────────────────

/** Subscribe the calling principal to a task. */
export const AddTaskWatcherCommandSchema = WatcherCommandBase.extend({
  taskId: CommTaskIdSchema,
});

/** Unsubscribe a specific watcher from a task. */
export const RemoveTaskWatcherCommandSchema = WatcherCommandBase.extend({
  taskId: CommTaskIdSchema,
  watcherId: TaskWatcherIdSchema,
});

/** Subscribe multiple principals to a task in one operation. */
export const BulkAddTaskWatchersCommandSchema = WatcherCommandBase.extend({
  taskId: CommTaskIdSchema,
  /** IDs of the principals to subscribe. At most 50 per call. */
  principalIds: z.array(PrincipalIdSchema).min(1).max(50),
}).superRefine((data, ctx) => {
  addDuplicateValuesIssue(
    data.principalIds,
    "principalIds",
    "Duplicate principalId values are not allowed.",
    ctx,
  );
});

/** Unsubscribe multiple watchers from a task in one operation. */
export const BulkRemoveTaskWatchersCommandSchema = WatcherCommandBase.extend({
  taskId: CommTaskIdSchema,
  watcherIds: z.array(TaskWatcherIdSchema).min(1).max(50),
}).superRefine((data, ctx) => {
  addDuplicateValuesIssue(
    data.watcherIds,
    "watcherIds",
    "Duplicate watcherId values are not allowed.",
    ctx,
  );
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddTaskWatcherCommand = z.infer<typeof AddTaskWatcherCommandSchema>;
export type RemoveTaskWatcherCommand = z.infer<typeof RemoveTaskWatcherCommandSchema>;
export type BulkAddTaskWatchersCommand = z.infer<typeof BulkAddTaskWatchersCommandSchema>;
export type BulkRemoveTaskWatchersCommand = z.infer<typeof BulkRemoveTaskWatchersCommandSchema>;
