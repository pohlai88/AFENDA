import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import {
  ArExpectedReceiptMethodSchema,
  ArExpectedReceiptProjectionStatusSchema,
} from "./ar-expected-receipt-projection.entity.js";

export const UpsertArExpectedReceiptProjectionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  sourceReceivableId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(255),
  dueDate: z.string().date(),
  expectedReceiptDate: z.string().date(),
  currencyCode: CurrencyCodeSchema,
  grossAmountMinor: z.string(),
  openAmountMinor: z.string(),
  receiptMethod: ArExpectedReceiptMethodSchema.nullable().optional(),
  status: ArExpectedReceiptProjectionStatusSchema.optional(),
  sourceVersion: z.string().trim().min(1).max(128),
});

export type UpsertArExpectedReceiptProjectionCommand = z.infer<
  typeof UpsertArExpectedReceiptProjectionCommandSchema
>;
