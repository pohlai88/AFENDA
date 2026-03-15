import { z } from "zod";
import { CommCommentIdSchema } from "./comment.js";
import { CommListLimitSchema } from "./query.js";
import { makeCommListResponseSchema } from "./response.js";
import { CommMentionSchema } from "./mention.js";

export const ListCommentMentionsQuerySchema = z.object({
  commentId: CommCommentIdSchema,
  limit: CommListLimitSchema,
});

export const ListCommentMentionsResponseSchema = makeCommListResponseSchema(CommMentionSchema);

export type ListCommentMentionsQuery = z.infer<typeof ListCommentMentionsQuerySchema>;
export type ListCommentMentionsResponse = z.infer<typeof ListCommentMentionsResponseSchema>;
