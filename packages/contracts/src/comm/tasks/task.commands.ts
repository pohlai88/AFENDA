import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema } from "../../shared/datetime.js";
import { EntityIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { CommProjectIdSchema } from "../shared/project-id.js";
import {
  CommTaskIdSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
  TaskTypeSchema,
} from "./task.entity.js";

export const CreateTaskCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  projectId: CommProjectIdSchema.optional(),
  parentTaskId: CommTaskIdSchema.optional(),
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(20_000).optional(),
  priority: TaskPrioritySchema.optional(),
  taskType: TaskTypeSchema.optional(),
  assigneeId: PrincipalIdSchema.optional(),
  dueDate: DateSchema.optional(),
  startDate: DateSchema.optional(),
  estimateMinutes: z.number().int().positive().optional(),
  contextEntityType: z.string().trim().min(1).max(128).optional(),
  contextEntityId: EntityIdSchema.optional(),
});

export const UpdateTaskCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  taskId: CommTaskIdSchema,
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(20_000).optional(),
  priority: TaskPrioritySchema.optional(),
  taskType: TaskTypeSchema.optional(),
  dueDate: DateSchema.nullable().optional(),
  startDate: DateSchema.nullable().optional(),
  estimateMinutes: z.number().int().positive().nullable().optional(),
  contextEntityType: z.string().trim().min(1).max(128).nullable().optional(),
  contextEntityId: EntityIdSchema.nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const AssignTaskCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  taskId: CommTaskIdSchema,
  assigneeId: PrincipalIdSchema,
});

export const TransitionTaskStatusCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  taskId: CommTaskIdSchema,
  toStatus: TaskStatusSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});

export const CompleteTaskCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  taskId: CommTaskIdSchema,
  actualMinutes: z.number().int().nonnegative().optional(),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const ArchiveTaskCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  taskId: CommTaskIdSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});

export const BulkAssignTasksCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  taskIds: z.array(CommTaskIdSchema).min(1).max(200),
  assigneeId: PrincipalIdSchema,
});

export const BulkTransitionTaskStatusCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  taskIds: z.array(CommTaskIdSchema).min(1).max(200),
  toStatus: TaskStatusSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});

export type CreateTaskCommand = z.infer<typeof CreateTaskCommandSchema>;
export type UpdateTaskCommand = z.infer<typeof UpdateTaskCommandSchema>;
export type AssignTaskCommand = z.infer<typeof AssignTaskCommandSchema>;
export type TransitionTaskStatusCommand = z.infer<typeof TransitionTaskStatusCommandSchema>;
export type CompleteTaskCommand = z.infer<typeof CompleteTaskCommandSchema>;
export type ArchiveTaskCommand = z.infer<typeof ArchiveTaskCommandSchema>;
export type BulkAssignTasksCommand = z.infer<typeof BulkAssignTasksCommandSchema>;
export type BulkTransitionTaskStatusCommand = z.infer<typeof BulkTransitionTaskStatusCommandSchema>;
