import type { DbClient } from "@afenda/db";
import {
  cashPositionSnapshot,
  liquidityForecast,
  liquidityForecastBucket,
  liquidityForecastBucketLineage,
  liquiditySourceFeed,
  liquidityScenario,
  outboxEvent,
} from "@afenda/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  LiquidityForecastBucketGranularity,
  LiquidityForecastId,
  LiquidityScenarioId,
  OrgId,
  PrincipalId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";
import { buildLiquidityForecastBuckets } from "./calculators/liquidity-forecast";
import { normalizeToBase } from "./fx-normalization.service";

export type LiquidityForecastServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type LiquidityForecastServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: LiquidityForecastServiceError };

export interface CreateLiquidityScenarioParams {
  code: string;
  name: string;
  scenarioType: "base_case" | "optimistic" | "stress" | "custom";
  horizonDays: number;
  assumptionSetVersion: string;
  assumptionsJson: Record<string, unknown>;
}

export interface ActivateLiquidityScenarioParams {
  liquidityScenarioId: LiquidityScenarioId;
}

export interface RequestLiquidityForecastParams {
  liquidityScenarioId: LiquidityScenarioId;
  cashPositionSnapshotId: string;
  forecastDate: string;
  startDate: string;
  endDate: string;
  bucketGranularity: LiquidityForecastBucketGranularity;
  baseCurrencyCode: string;
  sourceVersion: string;
}

function enumerateDailyBucketDates(startDate: string, endDate: string): Array<{ startDate: string; endDate: string }> {
  const buckets: Array<{ startDate: string; endDate: string }> = [];
  const startMs = Date.parse(`${startDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs > endMs) return buckets;

  const dayMs = 24 * 60 * 60 * 1000;
  for (let t = startMs; t <= endMs; t += dayMs) {
    const d = new globalThis.Date(t).toISOString().slice(0, 10);
    buckets.push({ startDate: d, endDate: d });
  }
  return buckets;
}

function addMinor(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

interface NormalizedForecastFeedRow {
  id: string;
  dueDate: string;
  direction: "inflow" | "outflow";
  originalCurrencyCode: string;
  normalizedAmountMinor: string;
  fxRateSnapshotId: string | null;
}

export async function createLiquidityScenario(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CreateLiquidityScenarioParams,
): Promise<LiquidityForecastServiceResult<{ id: LiquidityScenarioId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select({ id: liquidityScenario.id })
    .from(liquidityScenario)
    .where(and(eq(liquidityScenario.orgId, orgId), eq(liquidityScenario.code, params.code)));

  if (existing) {
    return {
      ok: false,
      error: {
        code: "TREASURY_LIQUIDITY_SCENARIO_CODE_EXISTS",
        message: "Liquidity scenario code already exists",
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.liquidity-scenario.created" as const,
    entityType: "liquidity_scenario" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      code: params.code,
      scenarioType: params.scenarioType,
      horizonDays: String(params.horizonDays),
      assumptionSetVersion: params.assumptionSetVersion,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(liquidityScenario)
      .values({
        orgId: orgId as string,
        code: params.code,
        name: params.name,
        scenarioType: params.scenarioType,
        status: "draft",
        horizonDays: params.horizonDays,
        assumptionSetVersion: params.assumptionSetVersion,
        assumptionsJson: params.assumptionsJson,
      })
      .returning({ id: liquidityScenario.id });

    if (!row) throw new Error("Failed to create liquidity scenario");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.LIQUIDITY_SCENARIO_CREATED",
      version: "1",
      correlationId,
      payload: { liquidityScenarioId: row.id },
    });

    return { id: row.id as LiquidityScenarioId };
  });

  return { ok: true, data: result };
}

export async function activateLiquidityScenario(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: ActivateLiquidityScenarioParams,
): Promise<LiquidityForecastServiceResult<{ id: LiquidityScenarioId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [row] = await db
    .select({ id: liquidityScenario.id })
    .from(liquidityScenario)
    .where(and(eq(liquidityScenario.orgId, orgId), eq(liquidityScenario.id, params.liquidityScenarioId)));

  if (!row) {
    return {
      ok: false,
      error: {
        code: "TREASURY_LIQUIDITY_SCENARIO_NOT_FOUND",
        message: "Liquidity scenario not found",
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "treasury.liquidity-scenario.activated" as const,
      entityType: "liquidity_scenario" as const,
      entityId: params.liquidityScenarioId as unknown as EntityId,
      correlationId,
      details: {},
    },
    async (tx) => {
      await tx
        .update(liquidityScenario)
        .set({ status: "inactive", updatedAt: sql`now()` })
        .where(eq(liquidityScenario.orgId, orgId));

      await tx
        .update(liquidityScenario)
        .set({ status: "active", updatedAt: sql`now()` })
        .where(and(eq(liquidityScenario.orgId, orgId), eq(liquidityScenario.id, params.liquidityScenarioId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.LIQUIDITY_SCENARIO_ACTIVATED",
        version: "1",
        correlationId,
        payload: { liquidityScenarioId: params.liquidityScenarioId },
      });
    },
  );

  return { ok: true, data: { id: params.liquidityScenarioId } };
}

export async function requestLiquidityForecast(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: RequestLiquidityForecastParams,
): Promise<LiquidityForecastServiceResult<{ id: LiquidityForecastId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [scenario] = await db
    .select({
      id: liquidityScenario.id,
      assumptionSetVersion: liquidityScenario.assumptionSetVersion,
      assumptionsJson: liquidityScenario.assumptionsJson,
    })
    .from(liquidityScenario)
    .where(and(eq(liquidityScenario.orgId, orgId), eq(liquidityScenario.id, params.liquidityScenarioId)));

  if (!scenario) {
    return {
      ok: false,
      error: { code: "TREASURY_LIQUIDITY_SCENARIO_NOT_FOUND", message: "Liquidity scenario not found" },
    };
  }

  const [snapshot] = await db
    .select({ id: cashPositionSnapshot.id, totalProjectedAvailableMinor: cashPositionSnapshot.totalProjectedAvailableMinor })
    .from(cashPositionSnapshot)
    .where(and(eq(cashPositionSnapshot.orgId, orgId), eq(cashPositionSnapshot.id, params.cashPositionSnapshotId)));

  if (!snapshot) {
    return {
      ok: false,
      error: {
        code: "TREASURY_CASH_POSITION_SNAPSHOT_NOT_FOUND",
        message: "Cash position snapshot not found",
      },
    };
  }

  if (Date.parse(`${params.startDate}T00:00:00.000Z`) > Date.parse(`${params.endDate}T00:00:00.000Z`)) {
    return {
      ok: false,
      error: {
        code: "TREASURY_LIQUIDITY_FORECAST_INVALID_DATE_RANGE",
        message: "startDate must be on or before endDate",
      },
    };
  }

  const existing = await db
    .select({ id: liquidityForecast.id })
    .from(liquidityForecast)
    .where(
      and(
        eq(liquidityForecast.orgId, orgId),
        eq(liquidityForecast.cashPositionSnapshotId, params.cashPositionSnapshotId),
        eq(liquidityForecast.sourceVersion, params.sourceVersion),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return { ok: true, data: { id: existing[0].id as LiquidityForecastId } };
  }

  const assumptions = (scenario.assumptionsJson ?? {}) as Record<string, unknown>;
  const assumedDailyInflowsMinor = String(assumptions.assumedDailyInflowsMinor ?? "0");
  const assumedDailyOutflowsMinor = String(assumptions.assumedDailyOutflowsMinor ?? "0");

  const feedRows = await db
    .select({
      id: liquiditySourceFeed.id,
      dueDate: liquiditySourceFeed.dueDate,
      direction: liquiditySourceFeed.direction,
      amountMinor: liquiditySourceFeed.amountMinor,
      currencyCode: liquiditySourceFeed.currencyCode,
    })
    .from(liquiditySourceFeed)
    .where(
      and(
        eq(liquiditySourceFeed.orgId, orgId),
        eq(liquiditySourceFeed.status, "open"),
        gte(liquiditySourceFeed.dueDate, params.startDate),
        lte(liquiditySourceFeed.dueDate, params.endDate),
      ),
    );

  const normalizedFeedRows: NormalizedForecastFeedRow[] = [];
  for (const row of feedRows) {
    const normalization = await normalizeToBase(db, {
      orgId,
      rateDate: row.dueDate,
      fromCurrencyCode: row.currencyCode,
      toCurrencyCode: params.baseCurrencyCode,
      amountMinor: row.amountMinor,
      sourceVersion: params.sourceVersion,
    });

    if (!normalization.ok) {
      return { ok: false, error: normalization.error };
    }

    normalizedFeedRows.push({
      id: row.id,
      dueDate: row.dueDate,
      direction: row.direction,
      originalCurrencyCode: row.currencyCode,
      normalizedAmountMinor: normalization.data.normalizedMinor,
      fxRateSnapshotId: normalization.data.fxRateSnapshotId,
    });
  }

  const feedTotalsByDate = new Map<string, { inflow: string; outflow: string }>();
  const feedSourceIdsByDate = new Map<string, string[]>();
  for (const row of normalizedFeedRows) {
    const current = feedTotalsByDate.get(row.dueDate) ?? { inflow: "0", outflow: "0" };
    if (row.direction === "inflow") {
      current.inflow = addMinor(current.inflow, row.normalizedAmountMinor);
    } else {
      current.outflow = addMinor(current.outflow, row.normalizedAmountMinor);
    }
    feedTotalsByDate.set(row.dueDate, current);

    const feedIds = feedSourceIdsByDate.get(row.dueDate) ?? [];
    feedIds.push(row.id);
    feedSourceIdsByDate.set(row.dueDate, feedIds);
  }

  const feedSourceIds = normalizedFeedRows.map((row) => row.id);
  const fxNormalizedFeedCount = normalizedFeedRows.filter((row) => row.fxRateSnapshotId).length;
  const bucketSourceIdsByDate: Record<string, string[]> = {};

  const dateBuckets = enumerateDailyBucketDates(params.startDate, params.endDate);
  const computed = buildLiquidityForecastBuckets({
    openingLiquidityMinor: snapshot.totalProjectedAvailableMinor,
    buckets: dateBuckets.map((bucket) => {
      const feed = feedTotalsByDate.get(bucket.startDate) ?? { inflow: "0", outflow: "0" };
      bucketSourceIdsByDate[bucket.startDate] = feedSourceIdsByDate.get(bucket.startDate) ?? [];
      return {
        expectedInflowsMinor: addMinor(feed.inflow, assumedDailyInflowsMinor),
        expectedOutflowsMinor: addMinor(feed.outflow, assumedDailyOutflowsMinor),
      };
    }),
  });

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.liquidity-forecast.calculated" as const,
    entityType: "liquidity_forecast" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      liquidityScenarioId: params.liquidityScenarioId,
      cashPositionSnapshotId: params.cashPositionSnapshotId,
      bucketGranularity: params.bucketGranularity,
      sourceVersion: params.sourceVersion,
      sourceFeedCount: String(feedSourceIds.length),
      sourceFeedIds: feedSourceIds,
      fxNormalizedFeedCount: String(fxNormalizedFeedCount),
      bucketSourceIdsByDate,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(liquidityForecast)
      .values({
        orgId: orgId as string,
        liquidityScenarioId: params.liquidityScenarioId,
        cashPositionSnapshotId: params.cashPositionSnapshotId,
        forecastDate: params.forecastDate,
        startDate: params.startDate,
        endDate: params.endDate,
        bucketGranularity: params.bucketGranularity,
        baseCurrencyCode: params.baseCurrencyCode,
        status: "calculated",
        sourceVersion: params.sourceVersion,
        assumptionSetVersion: scenario.assumptionSetVersion,
        openingLiquidityMinor: computed.openingLiquidityMinor,
        closingLiquidityMinor: computed.closingLiquidityMinor,
        totalExpectedInflowsMinor: computed.totalExpectedInflowsMinor,
        totalExpectedOutflowsMinor: computed.totalExpectedOutflowsMinor,
      })
      .returning({ id: liquidityForecast.id });

    if (!row) throw new Error("Failed to create liquidity forecast");

    auditEntry.entityId = row.id as unknown as EntityId;

    const insertedBuckets = await tx
      .insert(liquidityForecastBucket)
      .values(
        computed.buckets.map((bucket, idx) => ({
          orgId: orgId as string,
          liquidityForecastId: row.id,
          bucketIndex: idx,
          bucketStartDate: dateBuckets[idx]?.startDate ?? params.startDate,
          bucketEndDate: dateBuckets[idx]?.endDate ?? params.endDate,
          expectedInflowsMinor: bucket.expectedInflowsMinor,
          expectedOutflowsMinor: bucket.expectedOutflowsMinor,
          nativeExpectedInflowsMinor: bucket.expectedInflowsMinor,
          nativeExpectedOutflowsMinor: bucket.expectedOutflowsMinor,
          normalizedExpectedInflowsMinor: bucket.expectedInflowsMinor,
          normalizedExpectedOutflowsMinor: bucket.expectedOutflowsMinor,
          openingBalanceMinor: bucket.openingBalanceMinor,
          closingBalanceMinor: bucket.closingBalanceMinor,
          varianceMinor: null,
        })),
      )
      .returning({
        id: liquidityForecastBucket.id,
        bucketStartDate: liquidityForecastBucket.bucketStartDate,
      });

    const lineageRows = insertedBuckets.flatMap((bucket) =>
      (bucketSourceIdsByDate[bucket.bucketStartDate] ?? []).map((liquiditySourceFeedId) => ({
        orgId: orgId as string,
        liquidityForecastId: row.id,
        bucketId: bucket.id,
        liquiditySourceFeedId,
      })),
    );

    if (lineageRows.length > 0) {
      await tx.insert(liquidityForecastBucketLineage).values(lineageRows);
    }

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.LIQUIDITY_FORECAST_CALCULATED",
      version: "1",
      correlationId,
      payload: {
        liquidityForecastId: row.id,
        liquidityScenarioId: params.liquidityScenarioId,
        cashPositionSnapshotId: params.cashPositionSnapshotId,
        sourceLineage: {
          sourceFeedIds: feedSourceIds,
          fxNormalizedFeedCount,
          bucketSourceIdsByDate,
        },
      },
    });

    return { id: row.id as LiquidityForecastId };
  });

  return { ok: true, data: result };
}
