import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { CashPositionSnapshotIdSchema } from "./cash-position-snapshot.entity.js";
import { LiquidityScenarioIdSchema } from "./liquidity-scenario.entity.js";

export const LiquidityForecastStatusValues = ["draft", "calculated", "superseded"] as const;
export const LiquidityForecastStatusSchema = z.enum(LiquidityForecastStatusValues);
export type LiquidityForecastStatus = z.infer<typeof LiquidityForecastStatusSchema>;

export const LiquidityForecastBucketGranularityValues = ["daily", "weekly"] as const;
export const LiquidityForecastBucketGranularitySchema = z.enum(
  LiquidityForecastBucketGranularityValues,
);
export type LiquidityForecastBucketGranularity = z.infer<
  typeof LiquidityForecastBucketGranularitySchema
>;

export const LiquidityForecastIdSchema = brandedUuid("LiquidityForecastId");
export type LiquidityForecastId = z.infer<typeof LiquidityForecastIdSchema>;

export const LiquidityForecastBucketIdSchema = brandedUuid("LiquidityForecastBucketId");
export type LiquidityForecastBucketId = z.infer<typeof LiquidityForecastBucketIdSchema>;

export const LiquidityForecastSchema = z.object({
  id: LiquidityForecastIdSchema,
  orgId: OrgIdSchema,
  liquidityScenarioId: LiquidityScenarioIdSchema,
  cashPositionSnapshotId: CashPositionSnapshotIdSchema,
  forecastDate: z.string().date(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  bucketGranularity: LiquidityForecastBucketGranularitySchema,
  baseCurrencyCode: CurrencyCodeSchema,
  status: LiquidityForecastStatusSchema,
  sourceVersion: z.string().trim().min(1).max(128),
  assumptionSetVersion: z.string().trim().min(1).max(128),
  openingLiquidityMinor: z.string(),
  closingLiquidityMinor: z.string(),
  totalExpectedInflowsMinor: z.string(),
  totalExpectedOutflowsMinor: z.string(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});
export type LiquidityForecast = z.infer<typeof LiquidityForecastSchema>;

export const LiquidityForecastBucketSchema = z.object({
  id: LiquidityForecastBucketIdSchema,
  orgId: OrgIdSchema,
  liquidityForecastId: LiquidityForecastIdSchema,
  bucketIndex: z.number().int().nonnegative(),
  bucketStartDate: z.string().date(),
  bucketEndDate: z.string().date(),
  expectedInflowsMinor: z.string(),
  expectedOutflowsMinor: z.string(),
  openingBalanceMinor: z.string(),
  closingBalanceMinor: z.string(),
  varianceMinor: z.string().nullable(),
  createdAt: UtcDateTimeSchema,
});
export type LiquidityForecastBucket = z.infer<typeof LiquidityForecastBucketSchema>;
