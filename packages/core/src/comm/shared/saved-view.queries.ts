import type { DbClient } from "@afenda/db";
import { commSavedView } from "@afenda/db";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import type { CommSavedViewEntityType, CommSavedViewId, PrincipalId } from "@afenda/contracts";

export interface CommSavedViewRow {
  id: CommSavedViewId;
  orgId: string;
  principalId?: PrincipalId | null;
  entityType: CommSavedViewEntityType;
  name: string;
  filters: Record<string, unknown>;
  sortBy: unknown[];
  columns: unknown[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function listSavedViews(
  db: DbClient,
  orgId: string,
  entityType: CommSavedViewEntityType,
  principalId: PrincipalId,
): Promise<CommSavedViewRow[]> {
  const rows = await db
    .select()
    .from(commSavedView)
    .where(
      and(
        eq(commSavedView.orgId, orgId),
        eq(commSavedView.entityType, entityType),
        or(eq(commSavedView.principalId, principalId), isNull(commSavedView.principalId)),
      ),
    )
    .orderBy(desc(commSavedView.isDefault), asc(commSavedView.name), asc(commSavedView.id));

  return rows as CommSavedViewRow[];
}

export async function getSavedViewById(
  db: DbClient,
  orgId: string,
  viewId: CommSavedViewId,
): Promise<CommSavedViewRow | null> {
  const [row] = await db
    .select()
    .from(commSavedView)
    .where(and(eq(commSavedView.orgId, orgId), eq(commSavedView.id, viewId)));

  return (row as CommSavedViewRow) ?? null;
}
