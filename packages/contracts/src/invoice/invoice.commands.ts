/**
 * Invoice write commands — submit, approve, reject, void.
 *
 * RULES:
 *   1. Commands carry `idempotencyKey` always.
 *   2. `tenantId` is never in the command body — resolved from request context.
 *   3. Status transition guards (SoD, approval routing, GL posting) belong
 *      in `@afenda/core`, not here. Contracts only define the payload shape.
 *   4. `reason` is required on reject and void — mandatory for audit trails.
 */
import { z } from "zod";
import {
  DocumentIdSchema,
  InvoiceIdSchema,
  SupplierIdSchema,
} from "../shared/ids.js";
import { IdempotencyKeySchema } from "../shared/idempotency.js";
import { CurrencyCodeSchema } from "../shared/money.js";
import { DateSchema } from "../shared/datetime.js";

// ─── Submit ───────────────────────────────────────────────────────────────────

export const SubmitInvoiceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,

  // supplierId = buyer-side Supplier relationship record ID (not supplierTenantId).
  supplierId: SupplierIdSchema,

  invoiceNumber: z.string().trim().min(1).max(64),

  // Integer minor-unit (cents, fils, etc.) as bigint. Accepts bigint or numeric
  // string from JSON. Negative allowed (credit notes/memos).
  amountMinor:  z.coerce.bigint(),
  currencyCode: CurrencyCodeSchema,

  dueDate:     DateSchema.optional(),
  poReference: z.string().trim().min(1).max(64).optional(),

  documentIds: z.array(DocumentIdSchema).optional(),
});

// ─── Approve ──────────────────────────────────────────────────────────────────

export const ApproveInvoiceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  invoiceId:      InvoiceIdSchema,
  reason:         z.string().trim().min(1).max(500).optional(),
});

// ─── Reject ───────────────────────────────────────────────────────────────────

export const RejectInvoiceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  invoiceId:      InvoiceIdSchema,
  reason:         z.string().trim().min(1).max(500),
});

// ─── Void ─────────────────────────────────────────────────────────────────────

/**
 * Void a previously submitted or approved invoice.
 * `reason` is mandatory — voiding must always be auditable.
 * Transition guard (e.g. cannot void a posted invoice) belongs in `@afenda/core`.
 */
export const VoidInvoiceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  invoiceId:      InvoiceIdSchema,
  reason:         z.string().trim().min(1).max(500),
});

export type SubmitInvoiceCommand  = z.infer<typeof SubmitInvoiceCommandSchema>;
export type ApproveInvoiceCommand = z.infer<typeof ApproveInvoiceCommandSchema>;
export type RejectInvoiceCommand  = z.infer<typeof RejectInvoiceCommandSchema>;
export type VoidInvoiceCommand    = z.infer<typeof VoidInvoiceCommandSchema>;

