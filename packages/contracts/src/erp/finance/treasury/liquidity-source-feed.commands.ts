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
  sourceProjectionId: z.string().uuid().optional(),
  sourceBusinessId: z.string().uuid().optional(),
  sourceDocumentNumber: z.string().trim().max(128).nullable().optional(),
  bankAccountId: z.string().uuid().nullable().optional(),
  currencyCode: CurrencyCodeSchema,
  amountMinor: z.string(),
  dueDate: z.string().date().optional(),
  effectiveDate: z.string().date().optional(),
  direction: LiquiditySourceDirectionSchema,
  confidenceScore: z.number().min(0).max(1).nullable().optional(),
  status: LiquiditySourceFeedStatusSchema.optional(),
  sourceVersion: z.string().trim().min(1).max(128).optional(),
});

export type UpsertLiquiditySourceFeedCommand = z.infer<typeof UpsertLiquiditySourceFeedCommandSchema>;
