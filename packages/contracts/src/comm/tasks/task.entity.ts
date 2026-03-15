import { z } from "zod";
import {
  CommTaskIdSchema,
  EntityIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
} from "../../shared/ids.js";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { CommProjectIdSchema } from "../shared/project-id.js";
import {
  TaskContextEntityTypeSchema,
  TaskDescriptionSchema,
  TaskNumberSchema,
  TaskTitleSchema,
} from "./task.shared.js";

// ─── ID Brand ────────────────────────────────────────────────────────────────

// ─── Enum Values ────────────────────────────────────────────────────────────

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

// ─── Enum Schemas ────────────────────────────────────────────────────────────

export const TaskStatusSchema = z.enum(TaskStatusValues);
export const TaskPrioritySchema = z.enum(TaskPriorityValues);
export const TaskTypeSchema = z.enum(TaskTypeValues);

// ─── Entity ───────────────────────────────────────────────────────────────────

export const TaskSchema = z
  .object({
    id: CommTaskIdSchema,
    orgId: OrgIdSchema,
    projectId: CommProjectIdSchema.nullable().default(null),
    parentTaskId: CommTaskIdSchema.nullable().default(null),
    taskNumber: TaskNumberSchema,
    title: TaskTitleSchema,
    description: TaskDescriptionSchema.nullable().default(null),
    status: TaskStatusSchema,
    priority: TaskPrioritySchema,
    taskType: TaskTypeSchema,
    assigneeId: PrincipalIdSchema.nullable().default(null),
    reporterId: PrincipalIdSchema,
    dueDate: DateSchema.nullable().default(null),
    startDate: DateSchema.nullable().default(null),
    estimateMinutes: z.number().int().positive().nullable().default(null),
    actualMinutes: z.number().int().nonnegative().nullable().default(null),
    completedAt: UtcDateTimeSchema.nullable().default(null),
    completedByPrincipalId: PrincipalIdSchema.nullable().default(null),
    sortOrder: z.number().int(),
    contextEntityType: TaskContextEntityTypeSchema.nullable().default(null),
    contextEntityId: EntityIdSchema.nullable().default(null),
    slaBreachAt: UtcDateTimeSchema.nullable().default(null),
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.dueDate && data.dueDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dueDate must be on or after startDate.",
        path: ["dueDate"],
      });
    }
    if (data.status === "done" || data.status === "cancelled") {
      if (data.completedAt === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "completedAt is required when status is done or cancelled.",
          path: ["completedAt"],
        });
      }
      if (data.completedByPrincipalId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "completedByPrincipalId is required when status is done or cancelled.",
          path: ["completedByPrincipalId"],
        });
      }
    }
  });

// ─── Types ───────────────────────────────────────────────────────────────────

export type CommTaskId = z.infer<typeof CommTaskIdSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type Task = z.infer<typeof TaskSchema>;
