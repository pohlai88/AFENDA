import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { LiquidityForecastIdSchema, LiquidityForecastBucketIdSchema } from "./liquidity-forecast.entity.js";

export const ForecastVarianceIdSchema = brandedUuid("ForecastVarianceId");
export type ForecastVarianceId = z.infer<typeof ForecastVarianceIdSchema>;

export const ForecastVarianceSchema = z.object({
  id: ForecastVarianceIdSchema,
  orgId: OrgIdSchema,
  liquidityForecastId: LiquidityForecastIdSchema,
  bucketId: LiquidityForecastBucketIdSchema,
  actualInflowsMinor: z.string(),
  actualOutflowsMinor: z.string(),
  actualClosingBalanceMinor: z.string(),
  inflowVarianceMinor: z.string(),
  outflowVarianceMinor: z.string(),
  closingBalanceVarianceMinor: z.string(),
  measuredAt: UtcDateTimeSchema,
  createdAt: UtcDateTimeSchema,
});
export type ForecastVariance = z.infer<typeof ForecastVarianceSchema>;
