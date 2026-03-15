import { z } from "zod";
import {
  CommTaskIdSchema,
  CorrelationIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
} from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { TaskPrioritySchema, TaskStatusSchema, TaskTypeSchema } from "./task.entity.js";
import { TaskNumberSchema, TaskTitleSchema } from "./task.shared.js";

const TaskEventContextPayloadSchema = z.object({
  taskId: CommTaskIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

// ─── Task Core Payloads ──────────────────────────────────────────────────────

export const TaskCreatedEventSchema = z.object({
  ...TaskEventContextPayloadSchema.shape,
  taskNumber: TaskNumberSchema,
  title: TaskTitleSchema,
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  taskType: TaskTypeSchema,
  reporterId: PrincipalIdSchema,
});

export const TaskUpdatedEventSchema = z.object({
  ...TaskEventContextPayloadSchema.shape,
  updatedByPrincipalId: PrincipalIdSchema,
});

export const TaskAssignedEventSchema = z.object({
  ...TaskEventContextPayloadSchema.shape,
  assigneeId: PrincipalIdSchema.nullable(),
  assignedByPrincipalId: PrincipalIdSchema,
});

export const TaskStatusChangedEventSchema = z.object({
  ...TaskEventContextPayloadSchema.shape,
  fromStatus: TaskStatusSchema,
  toStatus: TaskStatusSchema,
  changedByPrincipalId: PrincipalIdSchema,
});

export const TaskCompletedEventSchema = z.object({
  ...TaskEventContextPayloadSchema.shape,
  completedAt: UtcDateTimeSchema,
  completedByPrincipalId: PrincipalIdSchema,
});

export const TaskArchivedEventSchema = z.object({
  ...TaskEventContextPayloadSchema.shape,
  archivedByPrincipalId: PrincipalIdSchema,
});

export const TaskDeletedEventSchema = z.object({
  ...TaskEventContextPayloadSchema.shape,
  deletedByPrincipalId: PrincipalIdSchema,
});

export const TaskEventPayloadSchemas = {
  Created: TaskCreatedEventSchema,
  Updated: TaskUpdatedEventSchema,
  Assigned: TaskAssignedEventSchema,
  StatusChanged: TaskStatusChangedEventSchema,
  Completed: TaskCompletedEventSchema,
  Archived: TaskArchivedEventSchema,
  Deleted: TaskDeletedEventSchema,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaskCreatedEvent = z.infer<typeof TaskCreatedEventSchema>;
export type TaskUpdatedEvent = z.infer<typeof TaskUpdatedEventSchema>;
export type TaskAssignedEvent = z.infer<typeof TaskAssignedEventSchema>;
export type TaskStatusChangedEvent = z.infer<typeof TaskStatusChangedEventSchema>;
export type TaskCompletedEvent = z.infer<typeof TaskCompletedEventSchema>;
export type TaskArchivedEvent = z.infer<typeof TaskArchivedEventSchema>;
export type TaskDeletedEvent = z.infer<typeof TaskDeletedEventSchema>;
