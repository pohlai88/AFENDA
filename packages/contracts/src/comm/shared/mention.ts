import { z } from "zod";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { CommCommentIdSchema, CommCommentEntityTypeSchema } from "./comment.js";

/**
 * A mention extracted from a comment body.
 * Mentions are derived server-side from `@<uuid>` patterns in comment text.
 * They are NOT user-commanded directly — emitted as outbox events by the comment service.
 */
export const CommMentionSchema = z.object({
  commentId: CommCommentIdSchema,
  mentionedPrincipalId: PrincipalIdSchema,
});

export type CommMention = z.infer<typeof CommMentionSchema>;

// ─── Reusable Field Schema ────────────────────────────────────────────────────

const MentionedPrincipalIdsSchema = z.array(PrincipalIdSchema).default([]);

// ─── Outbox Event Payload ─────────────────────────────────────────────────────

/**
 * Payload carried by the `COMM.COMMENT_MENTIONS_CREATED` outbox event.
 */
export const CommMentionsCreatedPayloadSchema = z
  .object({
    commentId: CommCommentIdSchema,
    entityType: CommCommentEntityTypeSchema,
    entityId: z.string().uuid(),
    authorPrincipalId: PrincipalIdSchema,
    mentionedPrincipalIds: MentionedPrincipalIdsSchema,
  })
  .superRefine((data, ctx) => {
    if (data.mentionedPrincipalIds.includes(data.authorPrincipalId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Author cannot mention themselves.",
        path: ["mentionedPrincipalIds"],
      });
    }
    const uniqueIds = new Set(data.mentionedPrincipalIds);
    if (uniqueIds.size !== data.mentionedPrincipalIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate mentions are not allowed.",
        path: ["mentionedPrincipalIds"],
      });
    }
  });

export type CommMentionsCreatedPayload = z.infer<typeof CommMentionsCreatedPayloadSchema>;
