import { z } from "zod";
import { CommListLimitSchema } from "../shared/query.js";
import { makeCommDetailResponseSchema, makeCommListResponseSchema } from "../shared/response.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  BoardResolutionIdSchema,
  BoardResolutionSchema,
  BoardResolutionVoteIdSchema,
  BoardResolutionVoteSchema,
  ResolutionStatusSchema,
  VoteSchema,
} from "./resolution.entity.js";

const BoardResolutionByIdQuerySchema = z.object({
  resolutionId: BoardResolutionIdSchema,
});

const BoardResolutionsByMeetingQuerySchema = z.object({
  meetingId: BoardMeetingIdSchema,
});

const BoardResolutionFilterQuerySchema = z.object({
  status: ResolutionStatusSchema.optional(),
});

const BoardResolutionVotesByResolutionQuerySchema = z.object({
  resolutionId: BoardResolutionIdSchema,
});

const BoardResolutionVoteFilterQuerySchema = z.object({
  vote: VoteSchema.optional(),
});

function makePaginationSchema<T extends z.ZodTypeAny>(cursorSchema: T) {
  return z.object({
    limit: CommListLimitSchema,
    cursor: cursorSchema.optional(),
  });
}

const ResolutionsListPaginationSchema = makePaginationSchema(BoardResolutionIdSchema);
const ResolutionVotesListPaginationSchema = makePaginationSchema(BoardResolutionVoteIdSchema);

export const GetBoardResolutionQuerySchema = BoardResolutionByIdQuerySchema;

export const ListBoardResolutionsQuerySchema = BoardResolutionsByMeetingQuerySchema.extend({
  ...BoardResolutionFilterQuerySchema.shape,
  ...ResolutionsListPaginationSchema.shape,
});

export const ListBoardResolutionVotesQuerySchema =
  BoardResolutionVotesByResolutionQuerySchema.extend({
    ...BoardResolutionVoteFilterQuerySchema.shape,
    ...ResolutionVotesListPaginationSchema.shape,
  });

export const GetBoardResolutionResponseSchema = makeCommDetailResponseSchema(BoardResolutionSchema);
export const ListBoardResolutionsResponseSchema = makeCommListResponseSchema(BoardResolutionSchema);
export const ListBoardResolutionVotesResponseSchema =
  makeCommListResponseSchema(BoardResolutionVoteSchema);

export type GetBoardResolutionQuery = z.infer<typeof GetBoardResolutionQuerySchema>;
export type ListBoardResolutionsQuery = z.infer<typeof ListBoardResolutionsQuerySchema>;
export type ListBoardResolutionVotesQuery = z.infer<typeof ListBoardResolutionVotesQuerySchema>;
export type GetBoardResolutionResponse = z.infer<typeof GetBoardResolutionResponseSchema>;
export type ListBoardResolutionsResponse = z.infer<typeof ListBoardResolutionsResponseSchema>;
export type ListBoardResolutionVotesResponse = z.infer<
  typeof ListBoardResolutionVotesResponseSchema
>;
