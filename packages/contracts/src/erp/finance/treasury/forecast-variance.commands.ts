import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { LiquidityForecastIdSchema, LiquidityForecastBucketIdSchema } from "./liquidity-forecast.entity.js";

export const RecordForecastVarianceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  liquidityForecastId: LiquidityForecastIdSchema,
  bucketId: LiquidityForecastBucketIdSchema,
  actualInflowsMinor: z.string(),
  actualOutflowsMinor: z.string(),
  actualClosingBalanceMinor: z.string(),
  measuredAt: z.string().datetime(),
});

export type RecordForecastVarianceCommand = z.infer<typeof RecordForecastVarianceCommandSchema>;
