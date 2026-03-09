/**
 * Invoice entity (AP vendor invoice header DTO).
 *
 * RULES:
 *   1. `InvoiceStatusValues` is `as const` — import it in `@afenda/db` for the
 *      Postgres enum; never duplicate the list.
 *   2. Status lifecycle: draft → submitted → approved → posted → paid.
 *      Terminal states: rejected, voided.
 *      Transition rules, guards, SoD, and approval routing belong in `@afenda/core`.
 *   3. `supplierId` is the buyer-side Supplier relationship record ID (SupplierIdSchema),
 *      NOT the supplier's tenant identity. AP controls suspension through the
 *      relationship row, not the party row.
 *   4. `amountMinor` is a `bigint` — no safe-integer ceiling. Accepts bigint
 *      or numeric string from JSON via `z.coerce.bigint()`.
 */
import { z } from "zod";
import {
  InvoiceIdSchema,
  SupplierIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
} from "../../../shared/ids.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { UtcDateTimeSchema, DateSchema } from "../../../shared/datetime.js";

/**
 * Status values as a const tuple — import this in @afenda/db to keep
 * the pgEnum values in sync: pgEnum('invoice_status', InvoiceStatusValues)
 *
 * Lifecycle: draft → submitted → approved → posted → paid
 * Terminals: rejected, voided
 * Transition rules (guards, SoD, approval routing) → @afenda/core.
 */
export const InvoiceStatusValues = [
  "draft",
  "submitted",
  "approved",
  "posted",
  "paid",
  "rejected",
  "voided",
] as const;

export const InvoiceStatusSchema = z.enum(InvoiceStatusValues);

export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

/**
 * Invoice header DTO (AP vendor invoice).
 *
 * `supplierId` — buyer-side Supplier relationship record ID (SupplierIdSchema).
 *               Do NOT store supplierTenantId here; suspension/terms are
 *               controlled through the relationship, not the party identity.
 *
 * `amountMinor` — bigint minor units (cents, fils, etc.). No safe-integer
 *                 ceiling. Negative values represent credit notes/memos.
 */
export const InvoiceSchema = z.object({
  id: InvoiceIdSchema,
  orgId: OrgIdSchema,
  supplierId: SupplierIdSchema,

  invoiceNumber: z.string().trim().min(1).max(64),

  amountMinor: z.coerce.bigint(),
  currencyCode: CurrencyCodeSchema,

  status: InvoiceStatusSchema,

  dueDate: DateSchema.nullable(),

  submittedByPrincipalId: PrincipalIdSchema.nullable(),
  // Null until the invoice leaves draft state.
  submittedAt: UtcDateTimeSchema.nullable(),

  poReference: z.string().trim().min(1).max(64).nullable(),

  // Sprint 2: payment fields — populated when status = "paid"
  paidAt: UtcDateTimeSchema.nullable(),
  paidByPrincipalId: PrincipalIdSchema.nullable(),
  paymentReference: z.string().trim().min(1).max(128).nullable(),

  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type Invoice = z.infer<typeof InvoiceSchema>;
