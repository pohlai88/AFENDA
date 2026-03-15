import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import {
  applyDateOrderRefinement,
  CommListLimitSchema,
  CommQueryTextSchema,
  CommSearchLimitSchema,
} from "../shared/query.js";
import {
  makeCommDetailResponseSchema,
  makeCommListResponseSchema,
  makeCommSearchResponseSchema,
} from "../shared/response.js";
import { BoardMeetingIdSchema, BoardMeetingSchema, MeetingStatusSchema } from "./meeting.entity.js";

const BoardMeetingByIdQuerySchema = z.object({
  meetingId: BoardMeetingIdSchema,
});

const BoardMeetingFilterQuerySchema = z.object({
  status: MeetingStatusSchema.optional(),
  chairId: PrincipalIdSchema.optional(),
});

const BoardMeetingDateRangeQuerySchema = z.object({
  scheduledBefore: DateSchema.optional(),
  scheduledAfter: DateSchema.optional(),
});

function makePaginationSchema<T extends z.ZodTypeAny>(cursorSchema: T) {
  return z.object({
    limit: CommListLimitSchema,
    cursor: cursorSchema.optional(),
  });
}

const MeetingListPaginationSchema = makePaginationSchema(BoardMeetingIdSchema);

const BoardMeetingSearchQuerySchema = z.object({
  query: CommQueryTextSchema,
  limit: CommSearchLimitSchema,
});

function withMeetingDateRangeRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((data, ctx) => {
    applyDateOrderRefinement(data as { scheduledAfter?: string; scheduledBefore?: string }, ctx, {
      fromKey: "scheduledAfter",
      toKey: "scheduledBefore",
      message: "scheduledBefore must be on or after scheduledAfter.",
      path: ["scheduledBefore"],
    });
  }) as T;
}

export const GetBoardMeetingQuerySchema = BoardMeetingByIdQuerySchema;

export const ListBoardMeetingsQuerySchema = withMeetingDateRangeRefinement(
  BoardMeetingFilterQuerySchema.extend({
    ...BoardMeetingDateRangeQuerySchema.shape,
    ...MeetingListPaginationSchema.shape,
  }),
);

export const SearchBoardMeetingsQuerySchema = withMeetingDateRangeRefinement(
  BoardMeetingFilterQuerySchema.extend({
    ...BoardMeetingDateRangeQuerySchema.shape,
    ...BoardMeetingSearchQuerySchema.shape,
  }),
);

export const GetBoardMeetingResponseSchema = makeCommDetailResponseSchema(BoardMeetingSchema);
export const ListBoardMeetingsResponseSchema = makeCommListResponseSchema(BoardMeetingSchema);
export const SearchBoardMeetingsResponseSchema = makeCommSearchResponseSchema(BoardMeetingSchema);

export type GetBoardMeetingQuery = z.infer<typeof GetBoardMeetingQuerySchema>;
export type ListBoardMeetingsQuery = z.infer<typeof ListBoardMeetingsQuerySchema>;
export type SearchBoardMeetingsQuery = z.infer<typeof SearchBoardMeetingsQuerySchema>;
export type GetBoardMeetingResponse = z.infer<typeof GetBoardMeetingResponseSchema>;
export type ListBoardMeetingsResponse = z.infer<typeof ListBoardMeetingsResponseSchema>;
export type SearchBoardMeetingsResponse = z.infer<typeof SearchBoardMeetingsResponseSchema>;
