import type { DbClient } from "@afenda/db";
import type { CommChatterContextEntityType } from "@afenda/contracts";
import { listComments, type CommCommentRow } from "../shared";

export type CommChatterMessageRow = CommCommentRow;

export interface ListChatterMessagesParams {
  orgId: string;
  entityType: CommChatterContextEntityType;
  entityId: string;
  limit?: number;
}

export async function listChatterMessages(
  db: DbClient,
  params: ListChatterMessagesParams,
): Promise<CommChatterMessageRow[]> {
  return listComments(db, {
    orgId: params.orgId,
    entityType: params.entityType,
    entityId: params.entityId,
    limit: params.limit,
  });
}
