import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { EntityIdSchema, OrgIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { CommCommentIdSchema } from "../shared/comment.js";

export const CommChatterMessageIdSchema = CommCommentIdSchema;

export const CommChatterContextEntityTypeValues = ["task", "project"] as const;
export const CommChatterContextEntityTypeSchema = z.enum(CommChatterContextEntityTypeValues);

export const CommChatterMessageSchema = z.object({
  id: CommChatterMessageIdSchema,
  orgId: OrgIdSchema,
  entityType: CommChatterContextEntityTypeSchema,
  entityId: EntityIdSchema,
  parentMessageId: CommChatterMessageIdSchema.nullable(),
  authorPrincipalId: PrincipalIdSchema,
  body: z.string().trim().min(1).max(20_000),
  editedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const ListChatterMessagesQuerySchema = z.object({
  entityType: CommChatterContextEntityTypeSchema,
  entityId: EntityIdSchema,
  limit: z.number().int().min(1).max(500).optional(),
});

export const PostChatterMessageCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  entityType: CommChatterContextEntityTypeSchema,
  entityId: EntityIdSchema,
  parentMessageId: CommChatterMessageIdSchema.optional(),
  body: z.string().trim().min(1).max(20_000),
});

export type CommChatterMessageId = z.infer<typeof CommChatterMessageIdSchema>;
export type CommChatterContextEntityType = z.infer<typeof CommChatterContextEntityTypeSchema>;
export type CommChatterMessage = z.infer<typeof CommChatterMessageSchema>;
export type ListChatterMessagesQuery = z.infer<typeof ListChatterMessagesQuerySchema>;
export type PostChatterMessageCommand = z.infer<typeof PostChatterMessageCommandSchema>;
