import type { DbClient } from "@afenda/db";
import { liquidityForecast, liquidityForecastBucket, liquidityScenario } from "@afenda/db";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX, type OrgId } from "@afenda/contracts";

export interface LiquidityScenarioRow {
  id: string;
  orgId: string;
  code: string;
  name: string;
  scenarioType: string;
  status: string;
  horizonDays: number;
  assumptionSetVersion: string;
  assumptionsJson: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LiquidityForecastRow {
  id: string;
  orgId: string;
  liquidityScenarioId: string;
  cashPositionSnapshotId: string;
  forecastDate: string;
  startDate: string;
  endDate: string;
  bucketGranularity: string;
  baseCurrencyCode: string;
  status: string;
  sourceVersion: string;
  assumptionSetVersion: string;
  openingLiquidityMinor: string;
  closingLiquidityMinor: string;
  totalExpectedInflowsMinor: string;
  totalExpectedOutflowsMinor: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LiquidityForecastBucketRow {
  id: string;
  orgId: string;
  liquidityForecastId: string;
  bucketIndex: number;
  bucketStartDate: string;
  bucketEndDate: string;
  expectedInflowsMinor: string;
  expectedOutflowsMinor: string;
  openingBalanceMinor: string;
  closingBalanceMinor: string;
  varianceMinor: string | null;
  createdAt: Date;
}

export interface LiquidityForecastListParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

export async function listLiquidityScenarios(db: DbClient, orgId: OrgId): Promise<LiquidityScenarioRow[]> {
  const rows = await db
    .select()
    .from(liquidityScenario)
    .where(eq(liquidityScenario.orgId, orgId))
    .orderBy(desc(liquidityScenario.createdAt));

  return rows.map((r) => ({ ...r, assumptionsJson: (r.assumptionsJson ?? {}) as Record<string, unknown> }));
}

export async function listLiquidityForecasts(
  db: DbClient,
  orgId: OrgId,
  params: LiquidityForecastListParams = {},
): Promise<{ data: LiquidityForecastRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(liquidityForecast.orgId, orgId)];

  if (params.status) {
    conditions.push(eq(liquidityForecast.status, params.status as "draft" | "calculated" | "superseded"));
  }

  if (params.cursor) {
    conditions.push(gt(liquidityForecast.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(liquidityForecast)
    .where(and(...conditions))
    .orderBy(asc(liquidityForecast.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map((r) => ({ ...r })),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getLiquidityForecastById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<LiquidityForecastRow | null> {
  const [row] = await db
    .select()
    .from(liquidityForecast)
    .where(and(eq(liquidityForecast.orgId, orgId), eq(liquidityForecast.id, id)));

  return row ?? null;
}

export async function listLiquidityForecastBuckets(
  db: DbClient,
  orgId: OrgId,
  forecastId: string,
): Promise<LiquidityForecastBucketRow[]> {
  const rows = await db
    .select()
    .from(liquidityForecastBucket)
    .where(
      and(
        eq(liquidityForecastBucket.orgId, orgId),
        eq(liquidityForecastBucket.liquidityForecastId, forecastId),
      ),
    )
    .orderBy(asc(liquidityForecastBucket.bucketIndex));

  return rows.map((r) => ({ ...r }));
}
