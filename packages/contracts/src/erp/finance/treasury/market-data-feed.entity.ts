import { z } from "zod";

export const marketDataFeedTypeSchema = z.enum([
  "fx_spot",
  "fx_forward_points",
  "yield_curve",
  "reference_rate",
]);

export const marketDataFeedStatusSchema = z.enum(["draft", "active", "inactive", "error"]);

export const marketDataFeedEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  providerCode: z.string().trim().min(1).max(64),
  feedType: marketDataFeedTypeSchema,
  baseCurrencyCode: z.string().trim().length(3).nullable(),
  quoteCurrencyCode: z.string().trim().length(3).nullable(),
  status: marketDataFeedStatusSchema,
  freshnessMinutes: z.number().int().positive(),
  lastRefreshRequestedAt: z.string().datetime().nullable(),
  lastRefreshSucceededAt: z.string().datetime().nullable(),
  lastRefreshFailedAt: z.string().datetime().nullable(),
  lastErrorCode: z.string().trim().max(128).nullable(),
  lastErrorMessage: z.string().trim().max(1000).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const marketDataObservationEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  marketDataFeedId: z.string().uuid(),
  observationDate: z.string().date(),
  valueScaled: z.string(),
  scale: z.number().int().positive(),
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: z.string().datetime(),
});

export type MarketDataFeedEntity = z.infer<typeof marketDataFeedEntitySchema>;
export type MarketDataObservationEntity = z.infer<typeof marketDataObservationEntitySchema>;
