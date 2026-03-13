import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { EntityIdSchema } from "../../shared/ids.js";
import {
  CommChatterContextEntityTypeSchema,
  CommChatterMessageIdSchema,
} from "./chatter.entity.js";

const BodySchema = z.string().trim().min(1).max(20_000);

export const PostChatterMessageCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  entityType: CommChatterContextEntityTypeSchema,
  entityId: EntityIdSchema,
  parentMessageId: CommChatterMessageIdSchema.nullable().optional().default(null),
  body: BodySchema,
});

export const UpdateChatterMessageCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  messageId: CommChatterMessageIdSchema,
  body: BodySchema,
});

export const DeleteChatterMessageCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  messageId: CommChatterMessageIdSchema,
});

export type PostChatterMessageCommand = z.infer<typeof PostChatterMessageCommandSchema>;
export type UpdateChatterMessageCommand = z.infer<typeof UpdateChatterMessageCommandSchema>;
export type DeleteChatterMessageCommand = z.infer<typeof DeleteChatterMessageCommandSchema>;
