import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { PaymentBatchIdSchema } from "./treasury-payment-batch.entity.js";
import { BankAccountIdSchema } from "./bank-account.entity.js";

// ── Create Batch ──────────────────────────────────────────────────────────────

export const CreatePaymentBatchCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  sourceBankAccountId: BankAccountIdSchema,
  description: z.string().trim().max(255).optional(),
  /** UUIDs of approved payment instructions to include */
  paymentInstructionIds: z.array(z.string().uuid()).min(1),
});
export type CreatePaymentBatchCommand = z.infer<typeof CreatePaymentBatchCommandSchema>;

// ── Request Release ───────────────────────────────────────────────────────────

export const RequestPaymentBatchReleaseCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  paymentBatchId: PaymentBatchIdSchema,
});
export type RequestPaymentBatchReleaseCommand = z.infer<
  typeof RequestPaymentBatchReleaseCommandSchema
>;

// ── Release ───────────────────────────────────────────────────────────────────

export const ReleasePaymentBatchCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  paymentBatchId: PaymentBatchIdSchema,
});
export type ReleasePaymentBatchCommand = z.infer<typeof ReleasePaymentBatchCommandSchema>;
