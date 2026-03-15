import type { DbClient } from "@afenda/db";
import { commComment, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  AddCommentCommand,
  CommCommentId,
  CorrelationId,
  DeleteCommentCommand,
  EditCommentCommand,
  EntityId,
  PrincipalId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit";
import { getCommentById } from "./comment.queries";

export interface CommCommentPolicyContext {
  principalId?: PrincipalId | null;
}

export type CommCommentServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type CommCommentServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommCommentServiceError };

/** Extract unique principal UUIDs from `@<uuid>` patterns in comment body. */
function extractMentions(body: string): string[] {
  const UUID_RE = /\@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = UUID_RE.exec(body)) !== null) {
    if (m[1]) ids.add(m[1].toLowerCase());
  }
  return [...ids];
}

export async function addComment(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommCommentPolicyContext,
  correlationId: CorrelationId,
  params: AddCommentCommand,
): Promise<CommCommentServiceResult<{ id: CommCommentId }>> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: {
        code: "IAM_PRINCIPAL_NOT_FOUND",
        message: "Authenticated principal is required",
      },
    };
  }

  const principalId = policyCtx.principalId;

  const orgId = ctx.activeContext.orgId;

  if (params.parentCommentId) {
    const parent = await getCommentById(db, orgId, params.parentCommentId);
    if (!parent) {
      return {
        ok: false,
        error: {
          code: "COMM_COMMENT_NOT_FOUND",
          message: "Parent comment not found",
          meta: { commentId: params.parentCommentId },
        },
      };
    }
  }

  const created = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "comment.created",
      entityType: "comment",
      correlationId,
      details: {
        entityType: params.entityType,
        entityId: params.entityId,
      },
    },
    async (tx) => {
      const [row] = await tx
        .insert(commComment)
        .values({
          orgId,
          entityType: params.entityType,
          entityId: params.entityId,
          parentCommentId: params.parentCommentId ?? null,
          authorPrincipalId: principalId,
          body: params.body,
        })
        .returning({ id: commComment.id });

      if (!row) throw new Error("Failed to create comment");

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.COMMENT_CREATED",
        version: "1",
        correlationId,
        payload: {
          commentId: row.id,
          entityType: params.entityType,
          entityId: params.entityId,
          parentCommentId: params.parentCommentId ?? null,
          authorPrincipalId: principalId,
        },
      });

      // Extract @mentions from body and emit a separate event for fan-out
      const mentionedPrincipalIds = extractMentions(params.body);
      if (mentionedPrincipalIds.length > 0) {
        await tx.insert(outboxEvent).values({
          orgId,
          type: "COMM.COMMENT_MENTIONS_CREATED",
          version: "1",
          correlationId,
          payload: {
            commentId: row.id,
            entityType: params.entityType,
            entityId: params.entityId,
            authorPrincipalId: principalId,
            mentionedPrincipalIds,
          },
        });
      }

      return row;
    },
  );

  return { ok: true, data: { id: created.id as CommCommentId } };
}

export async function editComment(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommCommentPolicyContext,
  correlationId: CorrelationId,
  params: EditCommentCommand,
): Promise<CommCommentServiceResult<{ id: CommCommentId }>> {
  const orgId = ctx.activeContext.orgId;
  const existing = await getCommentById(db, orgId, params.commentId);

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "COMM_COMMENT_NOT_FOUND",
        message: "Comment not found",
        meta: { commentId: params.commentId },
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "comment.edited",
      entityType: "comment",
      entityId: params.commentId as unknown as EntityId,
      correlationId,
      details: { commentId: params.commentId },
    },
    async (tx) => {
      await tx
        .update(commComment)
        .set({
          body: params.body,
          editedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(and(eq(commComment.orgId, orgId), eq(commComment.id, params.commentId)));
    },
  );

  return { ok: true, data: { id: params.commentId } };
}

export async function deleteComment(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommCommentPolicyContext,
  correlationId: CorrelationId,
  params: DeleteCommentCommand,
): Promise<CommCommentServiceResult<{ id: CommCommentId }>> {
  const orgId = ctx.activeContext.orgId;
  const existing = await getCommentById(db, orgId, params.commentId);

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "COMM_COMMENT_NOT_FOUND",
        message: "Comment not found",
        meta: { commentId: params.commentId },
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "comment.deleted",
      entityType: "comment",
      entityId: params.commentId as unknown as EntityId,
      correlationId,
      details: { commentId: params.commentId },
    },
    async (tx) => {
      await tx
        .delete(commComment)
        .where(and(eq(commComment.orgId, orgId), eq(commComment.id, params.commentId)));
    },
  );

  return { ok: true, data: { id: params.commentId } };
}
