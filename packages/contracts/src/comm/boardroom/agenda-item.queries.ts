import { z } from "zod";
import { CommListLimitSchema } from "../shared/query.js";
import { makeCommListResponseSchema } from "../shared/response.js";
import { BoardAgendaItemIdSchema, BoardAgendaItemSchema } from "./agenda-item.entity.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";

export const GetBoardAgendaItemQuerySchema = z.object({
  agendaItemId: BoardAgendaItemIdSchema,
});

export const ListBoardAgendaItemsQuerySchema = z.object({
  meetingId: BoardMeetingIdSchema,
  limit: CommListLimitSchema,
  cursor: BoardAgendaItemIdSchema.optional(),
});

export const ListBoardAgendaItemsResponseSchema = makeCommListResponseSchema(BoardAgendaItemSchema);

export type GetBoardAgendaItemQuery = z.infer<typeof GetBoardAgendaItemQuerySchema>;
export type ListBoardAgendaItemsQuery = z.infer<typeof ListBoardAgendaItemsQuerySchema>;
export type ListBoardAgendaItemsResponse = z.infer<typeof ListBoardAgendaItemsResponseSchema>;
