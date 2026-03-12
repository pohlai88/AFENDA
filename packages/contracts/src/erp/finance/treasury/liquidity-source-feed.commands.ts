import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import {
  LiquiditySourceDirectionSchema,
  LiquiditySourceFeedStatusSchema,
  LiquiditySourceFeedTypeSchema,
} from "./liquidity-source-feed.entity.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";

export const UpsertLiquiditySourceFeedCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  sourceType: LiquiditySourceFeedTypeSchema,
  sourceId: z.string().uuid(),
  sourceDocumentNumber: z.string().trim().max(128).nullable().optional(),
  bankAccountId: z.string().uuid().nullable().optional(),
  currencyCode: CurrencyCodeSchema,
  amountMinor: z.string(),
  dueDate: z.string().date(),
  direction: LiquiditySourceDirectionSchema,
  confidenceScore: z.number().min(0).max(1).nullable().optional(),
  status: LiquiditySourceFeedStatusSchema.optional(),
});

export type UpsertLiquiditySourceFeedCommand = z.infer<typeof UpsertLiquiditySourceFeedCommandSchema>;
