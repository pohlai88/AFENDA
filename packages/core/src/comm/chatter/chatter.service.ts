import type { DbClient } from "@afenda/db";
import type {
  CommChatterMessageId,
  CorrelationId,
  PostChatterMessageCommand,
} from "@afenda/contracts";
import type { OrgScopedContext } from "../../kernel/governance/audit/audit";
import { addComment, type CommCommentPolicyContext, type CommCommentServiceError } from "../shared";

export interface PostChatterMessageResult {
  messageId: CommChatterMessageId;
}

export type CommChatterServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommCommentServiceError };

export async function postChatterMessage(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommCommentPolicyContext,
  correlationId: CorrelationId,
  params: PostChatterMessageCommand,
): Promise<CommChatterServiceResult<PostChatterMessageResult>> {
  const result = await addComment(db, ctx, policyCtx, correlationId, {
    idempotencyKey: params.idempotencyKey,
    entityType: params.entityType,
    entityId: params.entityId,
    parentCommentId: params.parentMessageId,
    body: params.body,
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    data: { messageId: result.data.id },
  };
}
