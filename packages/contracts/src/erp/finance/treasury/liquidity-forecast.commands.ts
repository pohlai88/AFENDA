import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { CashPositionSnapshotIdSchema } from "./cash-position-snapshot.entity.js";
import {
  LiquidityForecastBucketGranularitySchema,
} from "./liquidity-forecast.entity.js";
import { LiquidityScenarioIdSchema } from "./liquidity-scenario.entity.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";

export const RequestLiquidityForecastCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  liquidityScenarioId: LiquidityScenarioIdSchema,
  cashPositionSnapshotId: CashPositionSnapshotIdSchema,
  forecastDate: z.string().date(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  bucketGranularity: LiquidityForecastBucketGranularitySchema,
  baseCurrencyCode: CurrencyCodeSchema,
  sourceVersion: z.string().trim().min(1).max(128),
});

export type RequestLiquidityForecastCommand = z.infer<typeof RequestLiquidityForecastCommandSchema>;
