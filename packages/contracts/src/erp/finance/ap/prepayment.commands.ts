/**
 * Prepayment command schemas for AP domain.
 *
 * Commands:
 *   - CreatePrepayment: Record advance payment to supplier
 *   - ApplyPrepayment: Apply prepayment balance to invoice
 *   - VoidPrepayment: Void unused prepayment
 */
import { z } from "zod";
import { brandedUuid } from "../../../shared/ids.js";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { DateSchema } from "../../../shared/datetime.js";
import { PrepaymentIdSchema } from "./prepayment.entity.js";

// ── Create Prepayment command ─────────────────────────────────────────────────

export const CreatePrepaymentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  supplierId: brandedUuid("SupplierId"),
  prepaymentNumber: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  currencyCode: CurrencyCodeSchema,
  amountMinor: z.coerce.bigint().positive(),
  paymentDate: DateSchema,
  paymentReference: z.string().min(1).max(100),
});

export type CreatePrepaymentCommand = z.infer<typeof CreatePrepaymentCommandSchema>;

// ── Apply Prepayment command ──────────────────────────────────────────────────

export const ApplyPrepaymentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  prepaymentId: PrepaymentIdSchema,
  invoiceId: brandedUuid("InvoiceId"),
  amountMinor: z.coerce.bigint().positive(),
});

export type ApplyPrepaymentCommand = z.infer<typeof ApplyPrepaymentCommandSchema>;

// ── Void Prepayment command ───────────────────────────────────────────────────

export const VoidPrepaymentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  prepaymentId: PrepaymentIdSchema,
  reason: z.string().min(1).max(500),
});

export type VoidPrepaymentCommand = z.infer<typeof VoidPrepaymentCommandSchema>;
