import { z } from "zod";
import { CommListLimitSchema } from "../shared/query.js";
import { makeCommListResponseSchema } from "../shared/response.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  BoardResolutionIdSchema,
  BoardResolutionSchema,
  BoardResolutionVoteIdSchema,
  BoardResolutionVoteSchema,
  ResolutionStatusSchema,
  VoteSchema,
} from "./resolution.entity.js";

export const GetBoardResolutionQuerySchema = z.object({
  resolutionId: BoardResolutionIdSchema,
});

export const ListBoardResolutionsQuerySchema = z.object({
  meetingId: BoardMeetingIdSchema,
  status: ResolutionStatusSchema.optional(),
  limit: CommListLimitSchema,
  cursor: BoardResolutionIdSchema.optional(),
});

export const ListBoardResolutionVotesQuerySchema = z.object({
  resolutionId: BoardResolutionIdSchema,
  vote: VoteSchema.optional(),
  limit: CommListLimitSchema,
  cursor: BoardResolutionVoteIdSchema.optional(),
});

export const ListBoardResolutionsResponseSchema = makeCommListResponseSchema(BoardResolutionSchema);
export const ListBoardResolutionVotesResponseSchema =
  makeCommListResponseSchema(BoardResolutionVoteSchema);

export type GetBoardResolutionQuery = z.infer<typeof GetBoardResolutionQuerySchema>;
export type ListBoardResolutionsQuery = z.infer<typeof ListBoardResolutionsQuerySchema>;
export type ListBoardResolutionVotesQuery = z.infer<typeof ListBoardResolutionVotesQuerySchema>;
export type ListBoardResolutionsResponse = z.infer<typeof ListBoardResolutionsResponseSchema>;
export type ListBoardResolutionVotesResponse = z.infer<
  typeof ListBoardResolutionVotesResponseSchema
>;
