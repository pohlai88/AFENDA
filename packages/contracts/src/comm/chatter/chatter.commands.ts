import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { EntityIdSchema } from "../../shared/ids.js";
import {
  CommChatterContextEntityTypeSchema,
  CommChatterMessageIdSchema,
} from "./chatter.entity.js";
import { CommChatterMessageBodyTextSchema } from "./chatter.shared.js";

const ChatterCommandBaseSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

export const PostChatterMessageCommandFieldsSchema = z.object({
  entityType: CommChatterContextEntityTypeSchema,
  entityId: EntityIdSchema,
  parentMessageId: CommChatterMessageIdSchema.nullable().optional().default(null),
  body: CommChatterMessageBodyTextSchema,
});

export const UpdateChatterMessageCommandFieldsSchema = z.object({
  messageId: CommChatterMessageIdSchema,
  body: CommChatterMessageBodyTextSchema,
});

export const DeleteChatterMessageCommandFieldsSchema = z.object({
  messageId: CommChatterMessageIdSchema,
});

export const PostChatterMessageCommandSchema = ChatterCommandBaseSchema.extend({
  ...PostChatterMessageCommandFieldsSchema.shape,
});

export const UpdateChatterMessageCommandSchema = ChatterCommandBaseSchema.extend({
  ...UpdateChatterMessageCommandFieldsSchema.shape,
});

export const DeleteChatterMessageCommandSchema = ChatterCommandBaseSchema.extend({
  ...DeleteChatterMessageCommandFieldsSchema.shape,
});

export type PostChatterMessageCommand = z.infer<typeof PostChatterMessageCommandSchema>;
export type UpdateChatterMessageCommand = z.infer<typeof UpdateChatterMessageCommandSchema>;
export type DeleteChatterMessageCommand = z.infer<typeof DeleteChatterMessageCommandSchema>;
