import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";

export const UpsertFxRateSnapshotCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  rateDate: z.string().date(),
  fromCurrencyCode: CurrencyCodeSchema,
  toCurrencyCode: CurrencyCodeSchema,
  rateScaled: z.string(),
  scale: z.number().int().positive(),
  providerCode: z.string().trim().min(1).max(64),
  sourceVersion: z.string().trim().min(1).max(128),
});

export type UpsertFxRateSnapshotCommand = z.infer<typeof UpsertFxRateSnapshotCommandSchema>;
