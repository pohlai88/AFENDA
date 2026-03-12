import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { marketDataFeedTypeSchema } from "./market-data-feed.entity";

export const createMarketDataFeedCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  code: z.string().trim().min(1).max(64),
  providerCode: z.string().trim().min(1).max(64),
  feedType: marketDataFeedTypeSchema,
  baseCurrencyCode: z.string().trim().length(3).nullable().optional(),
  quoteCurrencyCode: z.string().trim().length(3).nullable().optional(),
  freshnessMinutes: z.number().int().positive(),
});

export const activateMarketDataFeedCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  marketDataFeedId: z.string().uuid(),
});

export const requestMarketDataRefreshCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  marketDataFeedId: z.string().uuid(),
});

export type CreateMarketDataFeedCommand = z.infer<typeof createMarketDataFeedCommandSchema>;
export type ActivateMarketDataFeedCommand = z.infer<typeof activateMarketDataFeedCommandSchema>;
export type RequestMarketDataRefreshCommand = z.infer<typeof requestMarketDataRefreshCommandSchema>;
