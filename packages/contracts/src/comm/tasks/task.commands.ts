import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema } from "../../shared/datetime.js";
import { CommTaskIdSchema, EntityIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { CommProjectIdSchema } from "../shared/project-id.js";
import { TaskPrioritySchema, TaskStatusSchema, TaskTypeSchema } from "./task.entity.js";

// ─── Reusable Field Schemas ───────────────────────────────────────────────────

const TitleSchema = z.string().trim().min(1).max(500);
const DescriptionSchema = z.string().trim().max(20_000);
const ReasonSchema = z.string().trim().min(1).max(500);
const ContextEntityTypeSchema = z.string().trim().min(1).max(128);

// ─── Base Command Schema ──────────────────────────────────────────────────────

const TaskCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

// ─── Task Lifecycle Commands ──────────────────────────────────────────────────

export const CreateTaskCommandSchema = TaskCommandBase.extend({
  projectId: CommProjectIdSchema.optional(),
  parentTaskId: CommTaskIdSchema.optional(),
  title: TitleSchema,
  description: DescriptionSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  taskType: TaskTypeSchema.optional(),
  assigneeId: PrincipalIdSchema.optional(),
  dueDate: DateSchema.optional(),
  startDate: DateSchema.optional(),
  estimateMinutes: z.number().int().positive().optional(),
  contextEntityType: ContextEntityTypeSchema.optional(),
  contextEntityId: EntityIdSchema.optional(),
}).superRefine((data, ctx) => {
  if (data.parentTaskId !== undefined && data.parentTaskId === (data as any).id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A task cannot be its own parent.",
      path: ["parentTaskId"],
    });
  }
  if (data.startDate !== undefined && data.dueDate !== undefined && data.dueDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "dueDate must be on or after startDate.",
      path: ["dueDate"],
    });
  }
});

export const UpdateTaskCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  title: TitleSchema.optional(),
  description: DescriptionSchema.nullable().optional(),
  priority: TaskPrioritySchema.optional(),
  taskType: TaskTypeSchema.optional(),
  dueDate: DateSchema.nullable().optional(),
  startDate: DateSchema.nullable().optional(),
  estimateMinutes: z.number().int().positive().nullable().optional(),
  contextEntityType: ContextEntityTypeSchema.nullable().optional(),
  contextEntityId: EntityIdSchema.nullable().optional(),
  sortOrder: z.number().int().optional(),
}).superRefine((data, ctx) => {
  const { taskId: _taskId, idempotencyKey: _key, ...fields } = data;
  const hasUpdate = Object.values(fields).some((v) => v !== undefined);
  if (!hasUpdate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided for update.",
      path: [],
    });
  }
});

export const AssignTaskCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  assigneeId: PrincipalIdSchema,
});

export const TransitionTaskStatusCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  toStatus: TaskStatusSchema,
  reason: ReasonSchema.optional(),
});

export const CompleteTaskCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  actualMinutes: z.number().int().nonnegative().optional(),
  reason: ReasonSchema.optional(),
});

export const ArchiveTaskCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  reason: ReasonSchema.optional(),
});

export const DeleteTaskCommandSchema = TaskCommandBase.extend({
  taskId: CommTaskIdSchema,
  reason: ReasonSchema.optional(),
});

// ─── Bulk Commands ────────────────────────────────────────────────────────────

export const BulkAssignTasksCommandSchema = TaskCommandBase.extend({
  taskIds: z.array(CommTaskIdSchema).min(1).max(200),
  assigneeId: PrincipalIdSchema,
}).superRefine((data, ctx) => {
  const unique = new Set(data.taskIds);
  if (unique.size !== data.taskIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate taskId values are not allowed.",
      path: ["taskIds"],
    });
  }
});

export const BulkTransitionTaskStatusCommandSchema = TaskCommandBase.extend({
  taskIds: z.array(CommTaskIdSchema).min(1).max(200),
  toStatus: TaskStatusSchema,
  reason: ReasonSchema.optional(),
}).superRefine((data, ctx) => {
  const unique = new Set(data.taskIds);
  if (unique.size !== data.taskIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate taskId values are not allowed.",
      path: ["taskIds"],
    });
  }
});

export const BulkCompleteTasksCommandSchema = TaskCommandBase.extend({
  taskIds: z.array(CommTaskIdSchema).min(1).max(200),
  actualMinutes: z.number().int().nonnegative().optional(),
  reason: ReasonSchema.optional(),
}).superRefine((data, ctx) => {
  const unique = new Set(data.taskIds);
  if (unique.size !== data.taskIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate taskId values are not allowed.",
      path: ["taskIds"],
    });
  }
});

export const BulkArchiveTasksCommandSchema = TaskCommandBase.extend({
  taskIds: z.array(CommTaskIdSchema).min(1).max(200),
  reason: ReasonSchema.optional(),
}).superRefine((data, ctx) => {
  const unique = new Set(data.taskIds);
  if (unique.size !== data.taskIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate taskId values are not allowed.",
      path: ["taskIds"],
    });
  }
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
