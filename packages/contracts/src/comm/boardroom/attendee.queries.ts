import { z } from "zod";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { CommListLimitSchema } from "../shared/query.js";
import { makeCommListResponseSchema } from "../shared/response.js";
import {
  AttendeeStatusSchema,
  BoardMeetingAttendeeIdSchema,
  BoardMeetingAttendeeSchema,
} from "./attendee.entity.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";

export const GetBoardAttendeeQuerySchema = z.object({
  attendeeId: BoardMeetingAttendeeIdSchema,
});

export const ListBoardAttendeesQuerySchema = z.object({
  meetingId: BoardMeetingIdSchema,
  status: AttendeeStatusSchema.optional(),
  principalId: PrincipalIdSchema.optional(),
  limit: CommListLimitSchema,
  cursor: BoardMeetingAttendeeIdSchema.optional(),
});

export const ListBoardAttendeesResponseSchema = makeCommListResponseSchema(
  BoardMeetingAttendeeSchema,
);

export type GetBoardAttendeeQuery = z.infer<typeof GetBoardAttendeeQuerySchema>;
export type ListBoardAttendeesQuery = z.infer<typeof ListBoardAttendeesQuerySchema>;
export type ListBoardAttendeesResponse = z.infer<typeof ListBoardAttendeesResponseSchema>;
