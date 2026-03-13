import type { DbClient } from "@afenda/db";
import { commInboxItem, commNotificationPreference, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CommInboxItemId,
  CorrelationId,
  EntityId,
  MarkAllInboxReadCommand,
  MarkInboxItemReadCommand,
  PrincipalId,
  UpsertNotificationPreferenceCommand,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit";
import { getInboxItemById } from "./inbox.queries";

export interface CommInboxPolicyContext {
  principalId: PrincipalId | null;
}

export type CommInboxServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type CommInboxServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommInboxServiceError };

export async function markInboxItemRead(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommInboxPolicyContext,
  correlationId: CorrelationId,
  params: MarkInboxItemReadCommand,
): Promise<CommInboxServiceResult<{ id: CommInboxItemId }>> {
  const orgId = ctx.activeContext.orgId;
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }

  const existing = await getInboxItemById(db, orgId, params.itemId);
  if (!existing || existing.principalId !== policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "COMM_INBOX_ITEM_NOT_FOUND", message: "Inbox item not found" },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "inbox_item.read",
      entityType: "inbox_item",
      entityId: params.itemId as unknown as EntityId,
      correlationId,
      details: { itemId: params.itemId },
    },
    async (tx) => {
      await tx
        .update(commInboxItem)
        .set({ isRead: true, readAt: sql`now()` })
        .where(and(eq(commInboxItem.orgId, orgId), eq(commInboxItem.id, params.itemId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.INBOX_ITEM_READ",
        version: "1",
        correlationId,
        payload: { itemId: params.itemId, principalId: policyCtx.principalId },
      });
    },
  );

  return { ok: true, data: { id: params.itemId } };
}

export async function markAllInboxRead(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommInboxPolicyContext,
  correlationId: CorrelationId,
  _params: MarkAllInboxReadCommand,
): Promise<CommInboxServiceResult<{ count: number }>> {
  const orgId = ctx.activeContext.orgId;
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }

  const principalId = policyCtx.principalId;

  const result = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "inbox_item.read_all",
      entityType: "inbox_item",
      correlationId,
      details: { principalId },
    },
    async (tx) => {
      const rows = await tx
        .update(commInboxItem)
        .set({ isRead: true, readAt: sql`now()` })
        .where(
          and(
            eq(commInboxItem.orgId, orgId),
            eq(commInboxItem.principalId, principalId),
            eq(commInboxItem.isRead, false),
          ),
        )
        .returning({ id: commInboxItem.id });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.INBOX_ALL_READ",
        version: "1",
        correlationId,
        payload: { principalId, count: rows.length },
      });

      return rows.length;
    },
  );

  return { ok: true, data: { count: result } };
}

export async function upsertNotificationPreference(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommInboxPolicyContext,
  correlationId: CorrelationId,
  params: UpsertNotificationPreferenceCommand,
): Promise<CommInboxServiceResult<{ id: string }>> {
  const orgId = ctx.activeContext.orgId;
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }

  const principalId = policyCtx.principalId;
  const mutedUntilValue = params.mutedUntil ? sql`${params.mutedUntil}::timestamptz` : null;

  const id = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "notification_preference.updated",
      entityType: "notification_preference",
      correlationId,
      details: { eventType: params.eventType, channel: params.channel },
    },
    async (tx) => {
      const [row] = await tx
        .insert(commNotificationPreference)
        .values({
          orgId,
          principalId,
          eventType: params.eventType,
          channel: params.channel,
          enabled: params.enabled,
          mutedUntil: mutedUntilValue,
        })
        .onConflictDoUpdate({
          target: [
            commNotificationPreference.orgId,
            commNotificationPreference.principalId,
            commNotificationPreference.eventType,
            commNotificationPreference.channel,
          ],
          set: {
            enabled: params.enabled,
            mutedUntil: mutedUntilValue,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: commNotificationPreference.id });

      if (!row) throw new Error("Failed to upsert notification preference");

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.NOTIFICATION_PREFERENCE_UPDATED",
        version: "1",
        correlationId,
        payload: {
          preferenceId: row.id,
          principalId,
          eventType: params.eventType,
          channel: params.channel,
          enabled: params.enabled,
        },
      });

      return row.id;
    },
  );

  return { ok: true, data: { id } };
}
