import type { DbClient } from "@afenda/db";
import { commSubscription } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type {
  CommSubscriptionEntityType,
  CommSubscriptionId,
  PrincipalId,
} from "@afenda/contracts";

export interface CommSubscriptionRow {
  id: CommSubscriptionId;
  orgId: string;
  principalId: PrincipalId;
  entityType: CommSubscriptionEntityType;
  entityId: string;
  createdAt: Date;
}

export async function listSubscriptionsForEntity(
  db: DbClient,
  orgId: string,
  entityType: CommSubscriptionEntityType,
  entityId: string,
): Promise<CommSubscriptionRow[]> {
  const rows = await db
    .select()
    .from(commSubscription)
    .where(
      and(
        eq(commSubscription.orgId, orgId),
        eq(commSubscription.entityType, entityType),
        eq(commSubscription.entityId, entityId),
      ),
    )
    .orderBy(asc(commSubscription.createdAt), asc(commSubscription.id));

  return rows as CommSubscriptionRow[];
}

export async function getSubscriptionByUnique(
  db: DbClient,
  orgId: string,
  principalId: PrincipalId,
  entityType: CommSubscriptionEntityType,
  entityId: string,
): Promise<CommSubscriptionRow | null> {
  const [row] = await db
    .select()
    .from(commSubscription)
    .where(
      and(
        eq(commSubscription.orgId, orgId),
        eq(commSubscription.principalId, principalId),
        eq(commSubscription.entityType, entityType),
        eq(commSubscription.entityId, entityId),
      ),
    );

  return (row as CommSubscriptionRow) ?? null;
}
