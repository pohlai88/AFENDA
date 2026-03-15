import { z } from "zod";
import { CommListLimitSchema } from "../shared/query.js";
import { makeCommDetailResponseSchema, makeCommListResponseSchema } from "../shared/response.js";
import { BoardAgendaItemIdSchema, BoardAgendaItemSchema } from "./agenda-item.entity.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";

const BoardAgendaItemByIdQuerySchema = z.object({
  agendaItemId: BoardAgendaItemIdSchema,
});

const BoardAgendaItemsByMeetingQuerySchema = z.object({
  meetingId: BoardMeetingIdSchema,
});

function makePaginationSchema<T extends z.ZodTypeAny>(cursorSchema: T) {
  return z.object({
    limit: CommListLimitSchema,
    cursor: cursorSchema.optional(),
  });
}

const AgendaItemsListPaginationSchema = makePaginationSchema(BoardAgendaItemIdSchema);

export const GetBoardAgendaItemQuerySchema = BoardAgendaItemByIdQuerySchema;

export const ListBoardAgendaItemsQuerySchema = BoardAgendaItemsByMeetingQuerySchema.extend({
  ...AgendaItemsListPaginationSchema.shape,
});

export const GetBoardAgendaItemResponseSchema = makeCommDetailResponseSchema(BoardAgendaItemSchema);
export const ListBoardAgendaItemsResponseSchema = makeCommListResponseSchema(BoardAgendaItemSchema);

// Types
export type GetBoardAgendaItemQuery = z.infer<typeof GetBoardAgendaItemQuerySchema>;
export type ListBoardAgendaItemsQuery = z.infer<typeof ListBoardAgendaItemsQuerySchema>;
export type GetBoardAgendaItemResponse = z.infer<typeof GetBoardAgendaItemResponseSchema>;
export type ListBoardAgendaItemsResponse = z.infer<typeof ListBoardAgendaItemsResponseSchema>;
