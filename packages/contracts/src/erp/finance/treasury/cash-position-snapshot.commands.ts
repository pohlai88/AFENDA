import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";

export const RequestCashPositionSnapshotCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  snapshotDate: z.string().date(),
  asOfAt: z.string().datetime(),
  baseCurrencyCode: CurrencyCodeSchema,
  sourceVersion: z.string().trim().min(1).max(128),
});

export type RequestCashPositionSnapshotCommand = z.infer<
  typeof RequestCashPositionSnapshotCommandSchema
>;
