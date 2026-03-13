import type { DbClient } from "@afenda/db";
import { commInboxItem, commNotificationPreference } from "@afenda/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type {
  CommInboxItemId,
  CommInboxEntityType,
  CommNotificationChannel,
  PrincipalId,
} from "@afenda/contracts";

export interface CommInboxItemRow {
  id: CommInboxItemId;
  orgId: string;
  principalId: PrincipalId;
  eventType: string;
  entityType: CommInboxEntityType;
  entityId: string;
  title: string;
  body: string | null;
  isRead: boolean;
  readAt: Date | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface CommNotificationPreferenceRow {
  id: string;
  orgId: string;
  principalId: PrincipalId;
  eventType: string;
  channel: CommNotificationChannel;
  enabled: boolean;
  mutedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function listInboxItems(
  db: DbClient,
  orgId: string,
  principalId: PrincipalId,
  params?: {
    limit?: number;
    cursor?: string;
    unreadOnly?: boolean;
  },
): Promise<CommInboxItemRow[]> {
  const limit = params?.limit ?? 50;
  const cursorPredicate = params?.cursor
    ? sql`${commInboxItem.createdAt} < ${params.cursor}::timestamptz`
    : undefined;

  const rows = await db
    .select()
    .from(commInboxItem)
    .where(
      and(
        eq(commInboxItem.orgId, orgId),
        eq(commInboxItem.principalId, principalId),
        params?.unreadOnly ? eq(commInboxItem.isRead, false) : undefined,
        cursorPredicate,
      ),
    )
    .orderBy(desc(commInboxItem.createdAt), asc(commInboxItem.id))
    .limit(limit);

  return rows as CommInboxItemRow[];
}

export async function getInboxItemById(
  db: DbClient,
  orgId: string,
  itemId: CommInboxItemId,
): Promise<CommInboxItemRow | null> {
  const [row] = await db
    .select()
    .from(commInboxItem)
    .where(and(eq(commInboxItem.orgId, orgId), eq(commInboxItem.id, itemId)));

  return (row as CommInboxItemRow | undefined) ?? null;
}

export async function countUnreadInboxItems(
  db: DbClient,
  orgId: string,
  principalId: PrincipalId,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(commInboxItem)
    .where(
      and(
        eq(commInboxItem.orgId, orgId),
        eq(commInboxItem.principalId, principalId),
        eq(commInboxItem.isRead, false),
      ),
    );

  return row?.count ?? 0;
}

export async function listNotificationPreferences(
  db: DbClient,
  orgId: string,
  principalId: PrincipalId,
): Promise<CommNotificationPreferenceRow[]> {
  const rows = await db
    .select()
    .from(commNotificationPreference)
    .where(
      and(
        eq(commNotificationPreference.orgId, orgId),
        eq(commNotificationPreference.principalId, principalId),
      ),
    )
    .orderBy(asc(commNotificationPreference.eventType), asc(commNotificationPreference.channel));

  return rows as CommNotificationPreferenceRow[];
}
