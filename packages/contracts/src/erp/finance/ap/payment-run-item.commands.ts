/**
 * Command schemas for PaymentRunItem entity.
 *
 * RULES:
 *   1. Every command MUST include idempotencyKey.
 *   2. Server-generated fields (id, timestamps, actorPrincipalId) are NOT in commands.
 *   3. Add new error codes to shared/errors.ts.
 *   4. Add new audit actions to kernel/governance/audit/actions.ts.
 *   5. Add to barrel: packages/contracts/src/<domain>/index.ts
 */
import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { InvoiceIdSchema } from "../../../shared/ids.js";
import { PaymentRunIdSchema } from "./payment-run.entity.js";
import { PaymentRunItemIdSchema } from "./payment-run-item.entity.js";

// ── Add Item command ──────────────────────────────────────────────────────────

export const AddPaymentRunItemCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** Parent payment run */
  paymentRunId: PaymentRunIdSchema,
  /** The invoice to pay */
  invoiceId: InvoiceIdSchema,
  /** Amount to pay in minor units (optional — defaults to full invoice amount) */
  amountPaidMinor: z.coerce.bigint().nonnegative().optional(),
  /** Whether to take early payment discount if eligible */
  takeDiscount: z.boolean().optional().default(true),
});

export type AddPaymentRunItemCommand = z.infer<typeof AddPaymentRunItemCommandSchema>;

// ── Update Item command ───────────────────────────────────────────────────────

export const UpdatePaymentRunItemCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the item to update */
  id: PaymentRunItemIdSchema,
  /** Updated amount to pay */
  amountPaidMinor: z.coerce.bigint().nonnegative().optional(),
  /** Whether to take early payment discount */
  takeDiscount: z.boolean().optional(),
});

export type UpdatePaymentRunItemCommand = z.infer<typeof UpdatePaymentRunItemCommandSchema>;

// ── Remove Item command ───────────────────────────────────────────────────────

export const RemovePaymentRunItemCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the item to remove */
  id: PaymentRunItemIdSchema,
});

export type RemovePaymentRunItemCommand = z.infer<typeof RemovePaymentRunItemCommandSchema>;

// ── Exclude Item command ──────────────────────────────────────────────────────

export const ExcludePaymentRunItemCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the item to exclude */
  id: PaymentRunItemIdSchema,
  /** Reason for exclusion */
  reason: z.string().trim().min(1).max(500).optional(),
});

export type ExcludePaymentRunItemCommand = z.infer<typeof ExcludePaymentRunItemCommandSchema>;
