/**
 * Board agenda item entity schema.
 */
import { z } from "zod";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  AgendaItemEntityFieldsSchema,
  withPresenterDurationRefinement,
} from "./agenda-item.shared.js";

/** ID brand */
export const BoardAgendaItemIdSchema = UuidSchema.brand<"BoardAgendaItemId">();

export const BoardAgendaItemSchema = withPresenterDurationRefinement(
  z.object({
    id: BoardAgendaItemIdSchema,
    orgId: OrgIdSchema,
    meetingId: BoardMeetingIdSchema,
    ...AgendaItemEntityFieldsSchema.shape,
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  }),
);

/** Types */
export type BoardAgendaItemId = z.infer<typeof BoardAgendaItemIdSchema>;
export type BoardAgendaItem = z.infer<typeof BoardAgendaItemSchema>;
