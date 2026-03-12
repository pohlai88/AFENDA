import type { DbClient } from "@afenda/db";
import { forecastVariance, liquidityForecast, liquidityForecastBucket, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  ForecastVarianceId,
  LiquidityForecastId,
  LiquidityForecastBucketId,
  OrgId,
  PrincipalId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";
import { varianceMinor } from "./calculators/forecast-variance";

export type ForecastVarianceServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type ForecastVarianceServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ForecastVarianceServiceError };

export interface RecordForecastVarianceParams {
  liquidityForecastId: LiquidityForecastId;
  bucketId: LiquidityForecastBucketId;
  actualInflowsMinor: string;
  actualOutflowsMinor: string;
  actualClosingBalanceMinor: string;
  measuredAt: string;
}

export async function recordForecastVariance(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: RecordForecastVarianceParams,
): Promise<ForecastVarianceServiceResult<{ id: ForecastVarianceId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [existingForecast] = await db
    .select({ id: liquidityForecast.id })
    .from(liquidityForecast)
    .where(and(eq(liquidityForecast.orgId, orgId), eq(liquidityForecast.id, params.liquidityForecastId)));

  if (!existingForecast) {
    return {
      ok: false,
      error: {
        code: "TREASURY_LIQUIDITY_FORECAST_NOT_FOUND",
        message: "Liquidity forecast not found",
      },
    };
  }

  const [bucket] = await db
    .select({
      id: liquidityForecastBucket.id,
      expectedInflowsMinor: liquidityForecastBucket.expectedInflowsMinor,
      expectedOutflowsMinor: liquidityForecastBucket.expectedOutflowsMinor,
      closingBalanceMinor: liquidityForecastBucket.closingBalanceMinor,
    })
    .from(liquidityForecastBucket)
    .where(
      and(
        eq(liquidityForecastBucket.orgId, orgId),
        eq(liquidityForecastBucket.id, params.bucketId),
        eq(liquidityForecastBucket.liquidityForecastId, params.liquidityForecastId),
      ),
    );

  if (!bucket) {
    return {
      ok: false,
      error: {
        code: "TREASURY_LIQUIDITY_FORECAST_BUCKET_NOT_FOUND",
        message: "Liquidity forecast bucket not found",
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.forecast-variance.recorded" as const,
    entityType: "forecast_variance" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      liquidityForecastId: params.liquidityForecastId,
      bucketId: params.bucketId,
      measuredAt: params.measuredAt,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(forecastVariance)
      .values({
        orgId: orgId as string,
        liquidityForecastId: params.liquidityForecastId,
        bucketId: params.bucketId,
        actualInflowsMinor: params.actualInflowsMinor,
        actualOutflowsMinor: params.actualOutflowsMinor,
        actualClosingBalanceMinor: params.actualClosingBalanceMinor,
        inflowVarianceMinor: varianceMinor(bucket.expectedInflowsMinor, params.actualInflowsMinor),
        outflowVarianceMinor: varianceMinor(bucket.expectedOutflowsMinor, params.actualOutflowsMinor),
        closingBalanceVarianceMinor: varianceMinor(
          bucket.closingBalanceMinor,
          params.actualClosingBalanceMinor,
        ),
        measuredAt: params.measuredAt,
      })
      .returning({ id: forecastVariance.id });

    if (!row) throw new Error("Failed to record forecast variance");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.FORECAST_VARIANCE_RECORDED",
      version: "1",
      correlationId,
      payload: {
        forecastVarianceId: row.id,
        liquidityForecastId: params.liquidityForecastId,
        bucketId: params.bucketId,
      },
    });

    return { id: row.id as ForecastVarianceId };
  });

  return { ok: true, data: result };
}
