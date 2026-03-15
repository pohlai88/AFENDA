import { z } from "zod";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { CommListLimitSchema } from "../shared/query.js";
import { makeCommDetailResponseSchema, makeCommListResponseSchema } from "../shared/response.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  ActionItemStatusSchema,
  BoardActionItemIdSchema,
  BoardActionItemSchema,
  BoardMinuteIdSchema,
  BoardMinuteSchema,
} from "./minutes.entity.js";

const BoardMinuteByIdQuerySchema = z.object({
  minuteId: BoardMinuteIdSchema,
});

const BoardMinutesByMeetingQuerySchema = z.object({
  meetingId: BoardMeetingIdSchema,
});

const BoardActionItemByIdQuerySchema = z.object({
  actionItemId: BoardActionItemIdSchema,
});

const BoardActionItemFilterQuerySchema = z.object({
  status: ActionItemStatusSchema.optional(),
  assigneeId: PrincipalIdSchema.optional(),
});

const BoardActionItemsByMinuteQuerySchema = z.object({
  minuteId: BoardMinuteIdSchema,
});

function makePaginationSchema<T extends z.ZodTypeAny>(cursorSchema: T) {
  return z.object({
    limit: CommListLimitSchema,
    cursor: cursorSchema.optional(),
  });
}

const MinutesListPaginationSchema = makePaginationSchema(BoardMinuteIdSchema);

const ActionItemsListPaginationSchema = makePaginationSchema(BoardActionItemIdSchema);

function withMinutesQueryRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine(() => {
    // Reserved for future cross-field query invariants, e.g. meetingId must match minuteId.
  }) as T;
}

export const GetBoardMinuteQuerySchema = BoardMinuteByIdQuerySchema;

export const ListBoardMinutesQuerySchema = withMinutesQueryRefinement(
  BoardMinutesByMeetingQuerySchema.extend({
    ...MinutesListPaginationSchema.shape,
  }),
);

export const GetBoardActionItemQuerySchema = BoardActionItemByIdQuerySchema;

export const ListBoardActionItemsQuerySchema = withMinutesQueryRefinement(
  BoardActionItemsByMinuteQuerySchema.extend({
    ...BoardActionItemFilterQuerySchema.shape,
    ...ActionItemsListPaginationSchema.shape,
  }),
);

export const GetBoardMinuteResponseSchema = makeCommDetailResponseSchema(BoardMinuteSchema);
export const GetBoardActionItemResponseSchema = makeCommDetailResponseSchema(BoardActionItemSchema);
export const ListBoardMinutesResponseSchema = makeCommListResponseSchema(BoardMinuteSchema);
export const ListBoardActionItemsResponseSchema = makeCommListResponseSchema(BoardActionItemSchema);

export type GetBoardMinuteQuery = z.infer<typeof GetBoardMinuteQuerySchema>;
export type ListBoardMinutesQuery = z.infer<typeof ListBoardMinutesQuerySchema>;
export type GetBoardActionItemQuery = z.infer<typeof GetBoardActionItemQuerySchema>;
export type ListBoardActionItemsQuery = z.infer<typeof ListBoardActionItemsQuerySchema>;
export type GetBoardMinuteResponse = z.infer<typeof GetBoardMinuteResponseSchema>;
export type GetBoardActionItemResponse = z.infer<typeof GetBoardActionItemResponseSchema>;
export type ListBoardMinutesResponse = z.infer<typeof ListBoardMinutesResponseSchema>;
export type ListBoardActionItemsResponse = z.infer<typeof ListBoardActionItemsResponseSchema>;
