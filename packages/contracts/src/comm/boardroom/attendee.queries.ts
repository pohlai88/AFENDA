import { z } from "zod";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { CommListLimitSchema } from "../shared/query.js";
import { makeCommDetailResponseSchema, makeCommListResponseSchema } from "../shared/response.js";
import {
  AttendeeStatusSchema,
  BoardMeetingAttendeeIdSchema,
  BoardMeetingAttendeeSchema,
} from "./attendee.entity.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";

const BoardAttendeeByIdQuerySchema = z.object({
  attendeeId: BoardMeetingAttendeeIdSchema,
});

const BoardAttendeesByMeetingQuerySchema = z.object({
  meetingId: BoardMeetingIdSchema,
});

const BoardAttendeeFilterQuerySchema = z.object({
  status: AttendeeStatusSchema.optional(),
  principalId: PrincipalIdSchema.optional(),
});

function makePaginationSchema<T extends z.ZodTypeAny>(cursorSchema: T) {
  return z.object({
    limit: CommListLimitSchema,
    cursor: cursorSchema.optional(),
  });
}

const AttendeesListPaginationSchema = makePaginationSchema(BoardMeetingAttendeeIdSchema);

export const GetBoardAttendeeQuerySchema = BoardAttendeeByIdQuerySchema;

export const ListBoardAttendeesQuerySchema = BoardAttendeesByMeetingQuerySchema.extend({
  ...BoardAttendeeFilterQuerySchema.shape,
  ...AttendeesListPaginationSchema.shape,
});

export const GetBoardAttendeeResponseSchema = makeCommDetailResponseSchema(
  BoardMeetingAttendeeSchema,
);
export const ListBoardAttendeesResponseSchema = makeCommListResponseSchema(
  BoardMeetingAttendeeSchema,
);

export type GetBoardAttendeeQuery = z.infer<typeof GetBoardAttendeeQuerySchema>;
export type ListBoardAttendeesQuery = z.infer<typeof ListBoardAttendeesQuerySchema>;
export type GetBoardAttendeeResponse = z.infer<typeof GetBoardAttendeeResponseSchema>;
export type ListBoardAttendeesResponse = z.infer<typeof ListBoardAttendeesResponseSchema>;
