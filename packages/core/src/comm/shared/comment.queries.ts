import type { DbClient } from "@afenda/db";
import { commComment } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type { CommCommentEntityType, CommCommentId, PrincipalId } from "@afenda/contracts";

export interface CommCommentRow {
  id: CommCommentId;
  orgId: string;
  entityType: CommCommentEntityType;
  entityId: string;
  parentCommentId: CommCommentId | null;
  authorPrincipalId: PrincipalId;
  body: string;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListCommentsParams {
  orgId: string;
  entityType: CommCommentEntityType;
  entityId: string;
  limit?: number;
}

export async function listComments(
  db: DbClient,
  params: ListCommentsParams,
): Promise<CommCommentRow[]> {
  const limit = params.limit ?? 200;

  const rows = await db
    .select()
    .from(commComment)
    .where(
      and(
        eq(commComment.orgId, params.orgId),
        eq(commComment.entityType, params.entityType),
        eq(commComment.entityId, params.entityId),
      ),
    )
    .orderBy(asc(commComment.createdAt), asc(commComment.id))
    .limit(limit);

  return rows as CommCommentRow[];
}

export async function getCommentById(
  db: DbClient,
  orgId: string,
  commentId: CommCommentId,
): Promise<CommCommentRow | null> {
  const [row] = await db
    .select()
    .from(commComment)
    .where(and(eq(commComment.orgId, orgId), eq(commComment.id, commentId)));

  if (!row) return null;
  return row as CommCommentRow;
}
