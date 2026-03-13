import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { CommTaskIdSchema, PrincipalIdSchema, TaskWatcherIdSchema } from "../../shared/ids.js";

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
  const unique = new Set(data.principalIds);
  if (unique.size !== data.principalIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate principalId values are not allowed.",
      path: ["principalIds"],
    });
  }
});

/** Unsubscribe multiple watchers from a task in one operation. */
export const BulkRemoveTaskWatchersCommandSchema = WatcherCommandBase.extend({
  taskId: CommTaskIdSchema,
  watcherIds: z.array(TaskWatcherIdSchema).min(1).max(50),
}).superRefine((data, ctx) => {
  const unique = new Set(data.watcherIds);
  if (unique.size !== data.watcherIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate watcherId values are not allowed.",
      path: ["watcherIds"],
    });
  }
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddTaskWatcherCommand = z.infer<typeof AddTaskWatcherCommandSchema>;
export type RemoveTaskWatcherCommand = z.infer<typeof RemoveTaskWatcherCommandSchema>;
export type BulkAddTaskWatchersCommand = z.infer<typeof BulkAddTaskWatchersCommandSchema>;
export type BulkRemoveTaskWatchersCommand = z.infer<typeof BulkRemoveTaskWatchersCommandSchema>;
