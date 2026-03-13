import { z } from "zod";
import { EntityIdSchema, OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { CommProjectIdSchema } from "../shared/project-id.js";

export const CommTaskIdSchema = UuidSchema.brand<"CommTaskId">();

export const TaskStatusValues = [
  "draft",
  "open",
  "in_progress",
  "review",
  "blocked",
  "done",
  "cancelled",
  "archived",
] as const;

export const TaskPriorityValues = ["critical", "high", "medium", "low", "none"] as const;

export const TaskTypeValues = ["task", "bug", "feature", "improvement", "question"] as const;

export const TaskStatusSchema = z.enum(TaskStatusValues);
export const TaskPrioritySchema = z.enum(TaskPriorityValues);
export const TaskTypeSchema = z.enum(TaskTypeValues);

export const TaskSchema = z.object({
  id: CommTaskIdSchema,
  orgId: OrgIdSchema,
  projectId: CommProjectIdSchema.nullable(),
  parentTaskId: CommTaskIdSchema.nullable(),
  taskNumber: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(20_000).nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  taskType: TaskTypeSchema,
  assigneeId: PrincipalIdSchema.nullable(),
  reporterId: PrincipalIdSchema,
  dueDate: DateSchema.nullable(),
  startDate: DateSchema.nullable(),
  estimateMinutes: z.number().int().positive().nullable(),
  actualMinutes: z.number().int().nonnegative().nullable(),
  completedAt: UtcDateTimeSchema.nullable(),
  completedByPrincipalId: PrincipalIdSchema.nullable(),
  sortOrder: z.number().int(),
  contextEntityType: z.string().trim().min(1).max(128).nullable(),
  contextEntityId: EntityIdSchema.nullable(),
  slaBreachAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type CommTaskId = z.infer<typeof CommTaskIdSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type Task = z.infer<typeof TaskSchema>;
