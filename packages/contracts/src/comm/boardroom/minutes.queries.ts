import { z } from "zod";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { CommListLimitSchema } from "../shared/query.js";
import { makeCommListResponseSchema } from "../shared/response.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  ActionItemStatusSchema,
  BoardActionItemIdSchema,
  BoardActionItemSchema,
  BoardMinuteIdSchema,
  BoardMinuteSchema,
} from "./minutes.entity.js";

export const GetBoardMinuteQuerySchema = z.object({
  minuteId: BoardMinuteIdSchema,
});

export const ListBoardMinutesQuerySchema = z.object({
  meetingId: BoardMeetingIdSchema,
  limit: CommListLimitSchema,
  cursor: BoardMinuteIdSchema.optional(),
});

export const GetBoardActionItemQuerySchema = z.object({
  actionItemId: BoardActionItemIdSchema,
});

export const ListBoardActionItemsQuerySchema = z.object({
  minuteId: BoardMinuteIdSchema,
  status: ActionItemStatusSchema.optional(),
  assigneeId: PrincipalIdSchema.optional(),
  limit: CommListLimitSchema,
  cursor: BoardActionItemIdSchema.optional(),
});

export const ListBoardMinutesResponseSchema = makeCommListResponseSchema(BoardMinuteSchema);
export const ListBoardActionItemsResponseSchema = makeCommListResponseSchema(BoardActionItemSchema);

export type GetBoardMinuteQuery = z.infer<typeof GetBoardMinuteQuerySchema>;
export type ListBoardMinutesQuery = z.infer<typeof ListBoardMinutesQuerySchema>;
export type GetBoardActionItemQuery = z.infer<typeof GetBoardActionItemQuerySchema>;
export type ListBoardActionItemsQuery = z.infer<typeof ListBoardActionItemsQuerySchema>;
export type ListBoardMinutesResponse = z.infer<typeof ListBoardMinutesResponseSchema>;
export type ListBoardActionItemsResponse = z.infer<typeof ListBoardActionItemsResponseSchema>;
