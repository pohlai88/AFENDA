import { z } from "zod";
import { EntityIdSchema } from "../../shared/ids.js";
import { CommListLimitSchema } from "./query.js";
import { makeCommListResponseSchema } from "./response.js";
import { CommCommentEntityTypeSchema, CommCommentIdSchema, CommCommentSchema } from "./comment.js";

export const ListCommentsQuerySchema = z.object({
  entityType: CommCommentEntityTypeSchema,
  entityId: EntityIdSchema,
  parentCommentId: CommCommentIdSchema.nullable().optional(),
  limit: CommListLimitSchema,
  cursor: CommCommentIdSchema.optional(),
});

export const ListCommentsResponseSchema = makeCommListResponseSchema(CommCommentSchema);

export type ListCommentsQuery = z.infer<typeof ListCommentsQuerySchema>;
export type ListCommentsResponse = z.infer<typeof ListCommentsResponseSchema>;
