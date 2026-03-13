import { z } from "zod";
import { EntityIdSchema, OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";

// ─── ID Brand ─────────────────────────────────────────────────────────────────

export const CommCommentIdSchema = UuidSchema.brand<"CommCommentId">();

// ─── Enum Values & Schema ─────────────────────────────────────────────────────

export const CommCommentEntityTypeValues = [
  "task",
  "project",
  "approval_request",
  "document",
  "board_meeting",
  "announcement",
] as const;

export const CommCommentEntityTypeSchema = z.enum(CommCommentEntityTypeValues);

// ─── Reusable Field Schema ────────────────────────────────────────────────────

const BodySchema = z.string().trim().min(1).max(20_000);

// ─── Entity Schema ────────────────────────────────────────────────────────────

export const CommCommentSchema = z.object({
  id: CommCommentIdSchema,
  orgId: OrgIdSchema,
  entityType: CommCommentEntityTypeSchema,
  entityId: EntityIdSchema,
  parentCommentId: CommCommentIdSchema.nullable().default(null),
  authorPrincipalId: PrincipalIdSchema,
  body: BodySchema,
  editedAt: UtcDateTimeSchema.nullable().default(null),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

// ─── Base Command Schema ──────────────────────────────────────────────────────

const CommentCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

// ─── Commands ─────────────────────────────────────────────────────────────────

export const AddCommentCommandSchema = CommentCommandBase.extend({
  entityType: CommCommentEntityTypeSchema,
  entityId: EntityIdSchema,
  parentCommentId: CommCommentIdSchema.nullable().optional().default(null),
  body: BodySchema,
});

export const EditCommentCommandSchema = CommentCommandBase.extend({
  commentId: CommCommentIdSchema,
  body: BodySchema,
});

export const DeleteCommentCommandSchema = CommentCommandBase.extend({
  commentId: CommCommentIdSchema,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommCommentId = z.infer<typeof CommCommentIdSchema>;
export type CommCommentEntityType = z.infer<typeof CommCommentEntityTypeSchema>;
export type CommComment = z.infer<typeof CommCommentSchema>;
export type AddCommentCommand = z.infer<typeof AddCommentCommandSchema>;
export type EditCommentCommand = z.infer<typeof EditCommentCommandSchema>;
export type DeleteCommentCommand = z.infer<typeof DeleteCommentCommandSchema>;
