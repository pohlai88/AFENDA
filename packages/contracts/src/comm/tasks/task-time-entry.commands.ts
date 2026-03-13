import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema } from "../../shared/datetime.js";
import { CommTaskIdSchema, TaskTimeEntryIdSchema } from "../../shared/ids.js";

// ─── Reusable Field Schemas ────────────────────────────────────────────────────

const MinutesSchema = z.number().int().positive();
const DescriptionSchema = z.string().trim().max(2_000);

// ─── Base Command Schema ────────────────────────────────────────────────────

const TimeEntryCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

// ─── Commands ─────────────────────────────────────────────────────────────────

export const LogTaskTimeEntryCommandSchema = TimeEntryCommandBase.extend({
  taskId: CommTaskIdSchema,
  minutes: MinutesSchema,
  entryDate: DateSchema,
  description: DescriptionSchema.optional(),
});

export const UpdateTaskTimeEntryCommandSchema = TimeEntryCommandBase.extend({
  timeEntryId: TaskTimeEntryIdSchema,
  minutes: MinutesSchema.optional(),
  entryDate: DateSchema.optional(),
  description: DescriptionSchema.optional(),
}).superRefine((data, ctx) => {
  if (
    data.minutes === undefined &&
    data.entryDate === undefined &&
    data.description === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one of minutes, entryDate, or description must be provided.",
      path: [],
    });
  }
});

export const DeleteTaskTimeEntryCommandSchema = TimeEntryCommandBase.extend({
  timeEntryId: TaskTimeEntryIdSchema,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogTaskTimeEntryCommand = z.infer<typeof LogTaskTimeEntryCommandSchema>;
export type UpdateTaskTimeEntryCommand = z.infer<typeof UpdateTaskTimeEntryCommandSchema>;
export type DeleteTaskTimeEntryCommand = z.infer<typeof DeleteTaskTimeEntryCommandSchema>;
