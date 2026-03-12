import type { DbClient } from "@afenda/db";
import { forecastVariance } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";

export interface ForecastVarianceRow {
  id: string;
  orgId: string;
  liquidityForecastId: string;
  bucketId: string;
  actualInflowsMinor: string;
  actualOutflowsMinor: string;
  actualClosingBalanceMinor: string;
  inflowVarianceMinor: string;
  outflowVarianceMinor: string;
  closingBalanceVarianceMinor: string;
  measuredAt: string;
  createdAt: Date;
}

export async function listForecastVarianceByForecastId(
  db: DbClient,
  orgId: OrgId,
  liquidityForecastId: string,
): Promise<ForecastVarianceRow[]> {
  const rows = await db
    .select()
    .from(forecastVariance)
    .where(
      and(
        eq(forecastVariance.orgId, orgId),
        eq(forecastVariance.liquidityForecastId, liquidityForecastId),
      ),
    )
    .orderBy(asc(forecastVariance.measuredAt));

  return rows.map((r) => ({ ...r }));
}

export async function getForecastVarianceById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<ForecastVarianceRow | null> {
  const [row] = await db
    .select()
    .from(forecastVariance)
    .where(and(eq(forecastVariance.orgId, orgId), eq(forecastVariance.id, id)));

  return row ?? null;
}
