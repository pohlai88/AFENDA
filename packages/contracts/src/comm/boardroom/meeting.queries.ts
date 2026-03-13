import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import {
  applyDateOrderRefinement,
  CommListLimitSchema,
  CommQueryTextSchema,
  CommSearchLimitSchema,
} from "../shared/query.js";
import { makeCommListResponseSchema, makeCommSearchResponseSchema } from "../shared/response.js";
import { BoardMeetingIdSchema, BoardMeetingSchema, MeetingStatusSchema } from "./meeting.entity.js";

export const GetBoardMeetingQuerySchema = z.object({
  meetingId: BoardMeetingIdSchema,
});

export const ListBoardMeetingsQuerySchema = z
  .object({
    status: MeetingStatusSchema.optional(),
    chairId: PrincipalIdSchema.optional(),
    scheduledBefore: DateSchema.optional(),
    scheduledAfter: DateSchema.optional(),
    limit: CommListLimitSchema,
    cursor: BoardMeetingIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "scheduledAfter",
      toKey: "scheduledBefore",
      message: "scheduledBefore must be on or after scheduledAfter.",
      path: ["scheduledBefore"],
    });
  });

export const SearchBoardMeetingsQuerySchema = z.object({
  query: CommQueryTextSchema,
  status: MeetingStatusSchema.optional(),
  chairId: PrincipalIdSchema.optional(),
  limit: CommSearchLimitSchema,
});

export const ListBoardMeetingsResponseSchema = makeCommListResponseSchema(BoardMeetingSchema);
export const SearchBoardMeetingsResponseSchema = makeCommSearchResponseSchema(BoardMeetingSchema);

export type GetBoardMeetingQuery = z.infer<typeof GetBoardMeetingQuerySchema>;
export type ListBoardMeetingsQuery = z.infer<typeof ListBoardMeetingsQuerySchema>;
export type SearchBoardMeetingsQuery = z.infer<typeof SearchBoardMeetingsQuerySchema>;
export type ListBoardMeetingsResponse = z.infer<typeof ListBoardMeetingsResponseSchema>;
export type SearchBoardMeetingsResponse = z.infer<typeof SearchBoardMeetingsResponseSchema>;
