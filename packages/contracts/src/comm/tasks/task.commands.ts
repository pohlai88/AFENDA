import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema } from "../../shared/datetime.js";
import { CommTaskIdSchema, EntityIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { CommProjectIdSchema } from "../shared/project-id.js";
import { TaskPrioritySchema, TaskStatusSchema, TaskTypeSchema } from "./task.entity.js";
import {
  TaskContextEntityTypeSchema,
  TaskDescriptionSchema,
  TaskReasonSchema,
  TaskTitleSchema,
} from "./task.shared.js";

// ─── Base Command Schema ──────────────────────────────────────────────────────

const TaskCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

const BulkTaskIdsSchema = z.array(CommTaskIdSchema).min(1).max(200);

function addDateRangeIssue(
  data: { startDate?: string | null; dueDate?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.startDate && data.dueDate && data.dueDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "dueDate must be on or after startDate.",
      path: ["dueDate"],
    });
  }
}

function addUniqueTaskIdsIssue(taskIds: readonly string[], ctx: z.RefinementCtx) {
  if (new Set(taskIds).size !== taskIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate taskId values are not allowed.",
      path: ["taskIds"],
    });
  }
}

function addContextPairIssue(
  data: { contextEntityType?: string | null; contextEntityId?: string | null },
  ctx: z.RefinementCtx,
) {
  const hasType = data.contextEntityType !== undefined && data.contextEntityType !== null;
  const hasId = data.contextEntityId !== undefined && data.contextEntityId !== null;
  if (hasType !== hasId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "contextEntityType and contextEntityId must be provided together.",
      path: hasType ? ["contextEntityId"] : ["contextEntityType"],
    });
  }
}

function addNoFieldsToUpdateIssue(data: Record<string, unknown>, ctx: z.RefinementCtx) {
  if (Object.values(data).every((v) => v === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided for update.",
      path: [],
    });
  }
}

// ─── Task Lifecycle Commands ──────────────────────────────────────────────────

export const CreateTaskCommandSchema = TaskCommandBase.extend({
  projectId: CommProjectIdSchema.optional(),
  parentTaskId: CommTaskIdSchema.optional(),
  title: TaskTitleSchema,
  description: TaskDescriptionSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  taskType: TaskTypeSchema.optional(),
  assigneeId: PrincipalIdSchema.optional(),
  dueDate: DateSchema.optional(),
  startDate: DateSchema.optional(),
  estimateMinutes: z.number().int().positive().optional(),
  contextEntityType: TaskContextEntityTypeSchema.optional(),
  contextEntityId: EntityIdSchema.optional(),
}).superRefine((data, ctx) => {
  if (data.parentTaskId !== undefined && data.parentTaskId === (data as any).id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A task cannot be its own parent.",
      path: ["parentTaskId"],
    });
  }
  addDateRangeIssue(data, ctx);
  addContextPairIssue(data, ctx);
});

export const UpdateTaskCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  title: TaskTitleSchema.optional(),
  description: TaskDescriptionSchema.nullable().optional(),
  priority: TaskPrioritySchema.optional(),
  taskType: TaskTypeSchema.optional(),
  dueDate: DateSchema.nullable().optional(),
  startDate: DateSchema.nullable().optional(),
  estimateMinutes: z.number().int().positive().nullable().optional(),
  contextEntityType: TaskContextEntityTypeSchema.nullable().optional(),
  contextEntityId: EntityIdSchema.nullable().optional(),
  sortOrder: z.number().int().optional(),
}).superRefine((data, ctx) => {
  const { taskId: _taskId, idempotencyKey: _key, ...fields } = data;
  addNoFieldsToUpdateIssue(fields, ctx);
  addDateRangeIssue(data, ctx);
  addContextPairIssue(data, ctx);
});

export const AssignTaskCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  assigneeId: PrincipalIdSchema,
});

export const TransitionTaskStatusCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  toStatus: TaskStatusSchema,
  reason: TaskReasonSchema.optional(),
});

export const CompleteTaskCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  actualMinutes: z.number().int().nonnegative().optional(),
  reason: TaskReasonSchema.optional(),
});

export const ArchiveTaskCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  reason: TaskReasonSchema.optional(),
});

export const DeleteTaskCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  reason: TaskReasonSchema.optional(),
});

// ─── Bulk Commands ────────────────────────────────────────────────────────────

export const BulkAssignTasksCommandSchema = TaskCommandBase.extend({
  taskIds: BulkTaskIdsSchema,
  assigneeId: PrincipalIdSchema,
}).superRefine((data, ctx) => {
  addUniqueTaskIdsIssue(data.taskIds, ctx);
});

export const BulkTransitionTaskStatusCommandSchema = TaskCommandBase.extend({
  taskIds: BulkTaskIdsSchema,
  toStatus: TaskStatusSchema,
  reason: TaskReasonSchema.optional(),
}).superRefine((data, ctx) => {
  addUniqueTaskIdsIssue(data.taskIds, ctx);
});

export const BulkCompleteTasksCommandSchema = TaskCommandBase.extend({
  taskIds: BulkTaskIdsSchema,
  actualMinutes: z.number().int().nonnegative().optional(),
  reason: TaskReasonSchema.optional(),
}).superRefine((data, ctx) => {
  addUniqueTaskIdsIssue(data.taskIds, ctx);
});

export const BulkArchiveTasksCommandSchema = TaskCommandBase.extend({
  taskIds: BulkTaskIdsSchema,
  reason: TaskReasonSchema.optional(),
}).superRefine((data, ctx) => {
  addUniqueTaskIdsIssue(data.taskIds, ctx);
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateTaskCommand = z.infer<typeof CreateTaskCommandSchema>;
export type UpdateTaskCommand = z.infer<typeof UpdateTaskCommandSchema>;
export type AssignTaskCommand = z.infer<typeof AssignTaskCommandSchema>;
export type TransitionTaskStatusCommand = z.infer<typeof TransitionTaskStatusCommandSchema>;
export type CompleteTaskCommand = z.infer<typeof CompleteTaskCommandSchema>;
export type ArchiveTaskCommand = z.infer<typeof ArchiveTaskCommandSchema>;
export type DeleteTaskCommand = z.infer<typeof DeleteTaskCommandSchema>;
export type BulkAssignTasksCommand = z.infer<typeof BulkAssignTasksCommandSchema>;
export type BulkTransitionTaskStatusCommand = z.infer<typeof BulkTransitionTaskStatusCommandSchema>;
export type BulkCompleteTasksCommand = z.infer<typeof BulkCompleteTasksCommandSchema>;
export type BulkArchiveTasksCommand = z.infer<typeof BulkArchiveTasksCommandSchema>;
