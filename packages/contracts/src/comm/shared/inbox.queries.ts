import { z } from "zod";
import { EntityIdSchema } from "../../shared/ids.js";
import { CommListLimitSchema } from "./query.js";
import { makeCommListResponseSchema } from "./response.js";
import { CommInboxEntityTypeSchema, CommInboxItemIdSchema, CommInboxItemSchema } from "./inbox.js";

export const ListInboxItemsQuerySchema = z.object({
  entityType: CommInboxEntityTypeSchema.optional(),
  entityId: EntityIdSchema.optional(),
  unreadOnly: z.boolean().optional().default(false),
  limit: CommListLimitSchema,
  cursor: CommInboxItemIdSchema.optional(),
});

export const ListInboxItemsResponseSchema = makeCommListResponseSchema(CommInboxItemSchema);

export type ListInboxItemsQuery = z.infer<typeof ListInboxItemsQuerySchema>;
export type ListInboxItemsResponse = z.infer<typeof ListInboxItemsResponseSchema>;
