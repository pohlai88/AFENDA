import { z } from "zod";
import { EntityIdSchema, OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";

export const CommCommentIdSchema = UuidSchema.brand<"CommCommentId">();

export const CommCommentEntityTypeValues = [
  "task",
  "project",
  "approval_request",
  "document",
  "board_meeting",
  "announcement",
] as const;

export const CommCommentEntityTypeSchema = z.enum(CommCommentEntityTypeValues);

export const CommCommentSchema = z.object({
  id: CommCommentIdSchema,
  orgId: OrgIdSchema,
  entityType: CommCommentEntityTypeSchema,
  entityId: EntityIdSchema,
  parentCommentId: CommCommentIdSchema.nullable(),
  authorPrincipalId: PrincipalIdSchema,
  body: z.string().trim().min(1).max(20_000),
  editedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const AddCommentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  entityType: CommCommentEntityTypeSchema,
  entityId: EntityIdSchema,
  parentCommentId: CommCommentIdSchema.optional(),
  body: z.string().trim().min(1).max(20_000),
});

export const EditCommentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  commentId: CommCommentIdSchema,
  body: z.string().trim().min(1).max(20_000),
});

export const DeleteCommentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  commentId: CommCommentIdSchema,
});

export type CommCommentId = z.infer<typeof CommCommentIdSchema>;
export type CommCommentEntityType = z.infer<typeof CommCommentEntityTypeSchema>;
export type CommComment = z.infer<typeof CommCommentSchema>;
export type AddCommentCommand = z.infer<typeof AddCommentCommandSchema>;
export type EditCommentCommand = z.infer<typeof EditCommentCommandSchema>;
export type DeleteCommentCommand = z.infer<typeof DeleteCommentCommandSchema>;
