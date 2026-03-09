/**
 * Command schemas for PaymentRun entity.
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
import { PaymentRunIdSchema, PaymentMethodValues } from "./payment-run.entity.js";

// ── Create command ────────────────────────────────────────────────────────────

export const CreatePaymentRunCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** Optional description/notes */
  description: z.string().trim().max(500).optional(),
  /** Payment method for this run */
  paymentMethod: z.enum(PaymentMethodValues),
  /** ISO 4217 currency code */
  currencyCode: z.string().length(3).toUpperCase(),
  /** Scheduled payment date (YYYY-MM-DD) */
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreatePaymentRunCommand = z.infer<typeof CreatePaymentRunCommandSchema>;

// ── Update command ────────────────────────────────────────────────────────────

export const UpdatePaymentRunCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the payment run to update */
  id: PaymentRunIdSchema,
  /** Updated description */
  description: z.string().trim().max(500).nullish(),
  /** Updated payment method */
  paymentMethod: z.enum(PaymentMethodValues).optional(),
  /** Updated payment date */
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type UpdatePaymentRunCommand = z.infer<typeof UpdatePaymentRunCommandSchema>;

// ── Approve command ───────────────────────────────────────────────────────────

export const ApprovePaymentRunCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the payment run to approve */
  id: PaymentRunIdSchema,
});

export type ApprovePaymentRunCommand = z.infer<typeof ApprovePaymentRunCommandSchema>;

// ── Execute command ───────────────────────────────────────────────────────────

export const ExecutePaymentRunCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the payment run to execute */
  id: PaymentRunIdSchema,
  /** Optional bank reference to record */
  bankReference: z.string().trim().max(100).optional(),
});

export type ExecutePaymentRunCommand = z.infer<typeof ExecutePaymentRunCommandSchema>;

// ── Cancel command ────────────────────────────────────────────────────────────

export const CancelPaymentRunCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the payment run to cancel */
  id: PaymentRunIdSchema,
  /** Reason for cancellation */
  reason: z.string().trim().min(1).max(500),
});

export type CancelPaymentRunCommand = z.infer<typeof CancelPaymentRunCommandSchema>;

// ── Reverse command ───────────────────────────────────────────────────────────

export const ReversePaymentRunCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the payment run to reverse */
  id: PaymentRunIdSchema,
  /** Reason for reversal (required for audit) */
  reason: z.string().trim().min(1).max(500),
});

export type ReversePaymentRunCommand = z.infer<typeof ReversePaymentRunCommandSchema>;
