import type { DbClient } from "@afenda/db";
import { cashPositionSnapshotLineage, liquidityForecastBucketLineage } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";

export interface CashPositionSnapshotLineageRow {
  id: string;
  orgId: string;
  snapshotId: string;
  snapshotLineId: string;
  liquiditySourceFeedId: string;
  createdAt: Date;
}

export interface LiquidityForecastBucketLineageRow {
  id: string;
  orgId: string;
  liquidityForecastId: string;
  bucketId: string;
  liquiditySourceFeedId: string;
  createdAt: Date;
}

export async function listCashPositionSnapshotLineage(
  db: DbClient,
  orgId: OrgId,
  snapshotId: string,
): Promise<CashPositionSnapshotLineageRow[]> {
  const rows = await db
    .select()
    .from(cashPositionSnapshotLineage)
    .where(
      and(
        eq(cashPositionSnapshotLineage.orgId, orgId),
        eq(cashPositionSnapshotLineage.snapshotId, snapshotId),
      ),
    )
    .orderBy(asc(cashPositionSnapshotLineage.createdAt));

  return rows.map((r) => ({ ...r }));
}

export async function listLiquidityForecastBucketLineage(
  db: DbClient,
  orgId: OrgId,
  liquidityForecastId: string,
): Promise<LiquidityForecastBucketLineageRow[]> {
  const rows = await db
    .select()
    .from(liquidityForecastBucketLineage)
    .where(
      and(
        eq(liquidityForecastBucketLineage.orgId, orgId),
        eq(liquidityForecastBucketLineage.liquidityForecastId, liquidityForecastId),
      ),
    )
    .orderBy(asc(liquidityForecastBucketLineage.createdAt));

  return rows.map((r) => ({ ...r }));
}
