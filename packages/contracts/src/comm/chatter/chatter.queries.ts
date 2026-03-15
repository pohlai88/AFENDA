import { z } from "zod";
import { EntityIdSchema } from "../../shared/ids.js";
import { CommListLimitSchema } from "../shared/query.js";
import { makeCommDetailResponseSchema, makeCommListResponseSchema } from "../shared/response.js";
import {
  CommChatterContextEntityTypeSchema,
  CommChatterMessageIdSchema,
  CommChatterMessageSchema,
} from "./chatter.entity.js";

export const ListChatterMessagesQuerySchema = z.object({
  entityType: CommChatterContextEntityTypeSchema,
  entityId: EntityIdSchema,
  limit: CommListLimitSchema,
  cursor: CommChatterMessageIdSchema.optional(),
});

export const GetChatterMessageResponseSchema =
  makeCommDetailResponseSchema(CommChatterMessageSchema);
export const ListChatterMessagesResponseSchema =
  makeCommListResponseSchema(CommChatterMessageSchema);

export type GetChatterMessageResponse = z.infer<typeof GetChatterMessageResponseSchema>;
export type ListChatterMessagesQuery = z.infer<typeof ListChatterMessagesQuerySchema>;
export type ListChatterMessagesResponse = z.infer<typeof ListChatterMessagesResponseSchema>;
