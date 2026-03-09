/**
 * Command schemas for Invoice Line entity.
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
import { InvoiceIdSchema, AccountIdSchema } from "../../../shared/ids.js";
import { InvoiceLineIdSchema } from "./invoice-line.entity.js";

// ── Create command ────────────────────────────────────────────────────────────

export const CreateInvoiceLineCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** Parent invoice */
  invoiceId: InvoiceIdSchema,
  /** Line number within the invoice (1-based) */
  lineNumber: z.number().int().positive(),
  /** Description of goods/services */
  description: z.string().trim().min(1).max(500),
  /** Quantity (integer, e.g., 10 units) */
  quantity: z.number().int().positive(),
  /** Unit price in minor units (cents) */
  unitPriceMinor: z.coerce.bigint(),
  /** GL account for expense coding (optional) */
  glAccountId: AccountIdSchema.optional(),
  /** Tax code (e.g., "VAT20", "EXEMPT"). Optional. */
  taxCode: z.string().trim().max(50).optional(),
});

export type CreateInvoiceLineCommand = z.infer<typeof CreateInvoiceLineCommandSchema>;

// ── Update command ────────────────────────────────────────────────────────────

export const UpdateInvoiceLineCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the invoice line to update */
  id: InvoiceLineIdSchema,
  /** Updated description */
  description: z.string().trim().min(1).max(500).optional(),
  /** Updated quantity */
  quantity: z.number().int().positive().optional(),
  /** Updated unit price in minor units */
  unitPriceMinor: z.coerce.bigint().optional(),
  /** Updated GL account */
  glAccountId: AccountIdSchema.nullish(),
  /** Updated tax code */
  taxCode: z.string().trim().max(50).nullish(),
});

export type UpdateInvoiceLineCommand = z.infer<typeof UpdateInvoiceLineCommandSchema>;

// ── Delete command ────────────────────────────────────────────────────────────

export const DeleteInvoiceLineCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the invoice line to delete */
  id: InvoiceLineIdSchema,
});

export type DeleteInvoiceLineCommand = z.infer<typeof DeleteInvoiceLineCommandSchema>;
