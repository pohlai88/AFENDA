import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import {
  ApDuePaymentMethodSchema,
  ApDuePaymentProjectionStatusSchema,
} from "./ap-due-payment-projection.entity.js";

export const UpsertApDuePaymentProjectionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  sourcePayableId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string().trim().min(1).max(255),
  paymentTermCode: z.string().trim().max(64).nullable().optional(),
  dueDate: z.string().date(),
  expectedPaymentDate: z.string().date(),
  currencyCode: CurrencyCodeSchema,
  grossAmountMinor: z.string(),
  openAmountMinor: z.string(),
  paymentMethod: ApDuePaymentMethodSchema.nullable().optional(),
  status: ApDuePaymentProjectionStatusSchema.optional(),
  sourceVersion: z.string().trim().min(1).max(128),
});

export type UpsertApDuePaymentProjectionCommand = z.infer<
  typeof UpsertApDuePaymentProjectionCommandSchema
>;
