import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import { BoardAgendaItemIdSchema } from "./agenda-item.entity.js";
import {
  AgendaItemCommandAddFieldsSchema,
  AgendaItemCommandUpdateFieldsSchema,
  AgendaItemUpdateFieldKeys,
  withPresenterDurationRefinement,
} from "./agenda-item.shared.js";

/** Base schema for meeting commands */
const MeetingCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
  meetingId: BoardMeetingIdSchema,
});

export const AddAgendaItemCommandSchema = withPresenterDurationRefinement(
  MeetingCommandBase.extend(AgendaItemCommandAddFieldsSchema.shape),
);

export const UpdateAgendaItemCommandSchema = MeetingCommandBase.extend({
  agendaItemId: BoardAgendaItemIdSchema,
  ...AgendaItemCommandUpdateFieldsSchema.shape,
}).superRefine((data, ctx) => {
  const hasUpdateField = AgendaItemUpdateFieldKeys.some((field) => data[field] !== undefined);

  if (!hasUpdateField) {
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

export type AddAgendaItemCommand = z.infer<typeof AddAgendaItemCommandSchema>;
export type UpdateAgendaItemCommand = z.infer<typeof UpdateAgendaItemCommandSchema>;
export type RemoveAgendaItemCommand = z.infer<typeof RemoveAgendaItemCommandSchema>;
