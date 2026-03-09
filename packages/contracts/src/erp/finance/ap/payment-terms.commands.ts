/**
 * Command schemas for Payment Terms — create, update, deactivate.
 *
 * RULES:
 *   1. Every command MUST include idempotencyKey.
 *   2. Server-generated fields (id, timestamps, actorPrincipalId) are NOT in commands.
 *   3. Error codes: AP_PAYMENT_TERMS_* in shared/errors.ts.
 *   4. Audit actions: ap.paymentTerms.* in kernel/governance/audit/actions.ts.
 */
import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { PaymentTermsIdSchema, PaymentTermsStatusValues } from "./payment-terms.entity.js";

// ── Create command ────────────────────────────────────────────────────────────

export const CreatePaymentTermsCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** Unique code within org, e.g., "NET30", "2/10NET30" */
  code: z.string().trim().min(1).max(32),
  /** Human-readable description */
  description: z.string().trim().min(1).max(255),
  /** Days until payment is due */
  netDays: z.number().int().min(0).max(365),
  /** Early payment discount percentage. Null = no discount. */
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  /** Days within which the discount applies. Null = no discount. */
  discountDays: z.number().int().min(0).max(365).nullable().optional(),
});

export type CreatePaymentTermsCommand = z.infer<typeof CreatePaymentTermsCommandSchema>;

// ── Update command ────────────────────────────────────────────────────────────

export const UpdatePaymentTermsCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  id: PaymentTermsIdSchema,
  /** Human-readable description */
  description: z.string().trim().min(1).max(255).optional(),
  /** Days until payment is due */
  netDays: z.number().int().min(0).max(365).optional(),
  /** Early payment discount percentage. Null = no discount. */
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  /** Days within which the discount applies. Null = no discount. */
  discountDays: z.number().int().min(0).max(365).nullable().optional(),
  /** Status: active or inactive */
  status: z.enum(PaymentTermsStatusValues).optional(),
});

export type UpdatePaymentTermsCommand = z.infer<typeof UpdatePaymentTermsCommandSchema>;
