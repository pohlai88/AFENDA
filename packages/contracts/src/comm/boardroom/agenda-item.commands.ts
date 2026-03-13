import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import { BoardAgendaItemIdSchema } from "./agenda-item.entity.js";

/** Reusable string schemas */
const TitleSchema = z.string().trim().min(1).max(500);
const DescriptionSchema = z.string().trim().max(10_000);

/** Base schema for meeting commands */
const MeetingCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
  meetingId: BoardMeetingIdSchema,
});

export const AddAgendaItemCommandSchema = MeetingCommandBase.extend({
  title: TitleSchema,
  description: DescriptionSchema.nullable().default(null).optional(),
  sortOrder: z.number().int().min(0).optional(),
  presenterId: z.string().uuid().nullable().default(null).optional(),
  durationMinutes: z.number().int().min(0).max(480).nullable().default(null).optional(),
}).superRefine((data, ctx) => {
  if (data.presenterId && !data.durationMinutes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Agenda items with a presenter must include durationMinutes.",
      path: ["durationMinutes"],
    });
  }
});

export type AddAgendaItemCommand = z.infer<typeof AddAgendaItemCommandSchema>;

export const UpdateAgendaItemCommandSchema = MeetingCommandBase.extend({
  agendaItemId: BoardAgendaItemIdSchema,
  title: TitleSchema.optional(),
  description: DescriptionSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  presenterId: PrincipalIdSchema.nullable().optional(),
  durationMinutes: z.number().int().min(0).max(480).nullable().optional(),
}).superRefine((data, ctx) => {
  if (
    data.title === undefined &&
    data.description === undefined &&
    data.sortOrder === undefined &&
    data.presenterId === undefined &&
    data.durationMinutes === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided for update.",
      path: [],
    });
  }
});

export const RemoveAgendaItemCommandSchema = MeetingCommandBase.extend({
  agendaItemId: BoardAgendaItemIdSchema,
});

export type UpdateAgendaItemCommand = z.infer<typeof UpdateAgendaItemCommandSchema>;
export type RemoveAgendaItemCommand = z.infer<typeof RemoveAgendaItemCommandSchema>;
