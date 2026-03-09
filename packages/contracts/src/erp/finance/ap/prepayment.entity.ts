/**
 * Prepayment entity — advance payments to suppliers before goods/services delivered.
 *
 * RULES:
 *   1. Prepayments are created against a supplier, not a specific invoice.
 *   2. Application of prepayment to invoice reduces both prepayment balance and invoice balance.
 *   3. `amountMinor` is bigint for precision — no floats for money.
 *   4. Status lifecycle: PENDING → AVAILABLE → DEPLETED (or VOIDED)
 */
import { z } from "zod";
import { brandedUuid } from "../../../shared/ids.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { UtcDateTimeSchema, DateSchema } from "../../../shared/datetime.js";

// ── Branded IDs ───────────────────────────────────────────────────────────────

export const PrepaymentIdSchema = brandedUuid("PrepaymentId");
export type PrepaymentId = z.infer<typeof PrepaymentIdSchema>;

export const PrepaymentApplicationIdSchema = brandedUuid("PrepaymentApplicationId");
export type PrepaymentApplicationId = z.infer<typeof PrepaymentApplicationIdSchema>;

// ── Status values (as const for DB enum + switch statements) ──────────────────

export const PrepaymentStatusValues = [
  "PENDING",     // Created but not yet available (e.g., awaiting bank confirmation)
  "AVAILABLE",   // Ready to be applied to invoices
  "DEPLETED",    // Fully applied, balance is zero
  "VOIDED",      // Cancelled/reversed
] as const;

export type PrepaymentStatus = (typeof PrepaymentStatusValues)[number];

// ── Prepayment schema ─────────────────────────────────────────────────────────

export const PrepaymentSchema = z.object({
  id: PrepaymentIdSchema,
  orgId: brandedUuid("OrgId"),
  
  /** The supplier this prepayment is for */
  supplierId: brandedUuid("SupplierId"),
  
  /** Human-readable prepayment number (e.g., "PP-2026-0001") */
  prepaymentNumber: z.string().min(1).max(50),
  
  /** Optional description/memo */
  description: z.string().max(500).optional(),
  
  /** ISO 4217 currency code */
  currencyCode: CurrencyCodeSchema,
  
  /** Original prepayment amount in minor units (cents) */
  originalAmountMinor: z.coerce.bigint(),
  
  /** Remaining unapplied balance in minor units */
  balanceMinor: z.coerce.bigint(),
  
  /** Date the prepayment was made */
  paymentDate: DateSchema,
  
  /** Bank reference or check number */
  paymentReference: z.string().max(100).optional(),
  
  /** Current status */
  status: z.enum(PrepaymentStatusValues),
  
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type Prepayment = z.infer<typeof PrepaymentSchema>;

// ── Prepayment Application schema ─────────────────────────────────────────────
// Records the application of a prepayment to a specific invoice

export const PrepaymentApplicationSchema = z.object({
  id: PrepaymentApplicationIdSchema,
  orgId: brandedUuid("OrgId"),
  
  /** The prepayment being applied */
  prepaymentId: PrepaymentIdSchema,
  
  /** The invoice receiving the application */
  invoiceId: brandedUuid("InvoiceId"),
  
  /** Amount applied to this invoice in minor units */
  appliedAmountMinor: z.coerce.bigint(),
  
  /** Application date */
  appliedAt: UtcDateTimeSchema,
  
  /** Principal who applied the prepayment */
  appliedByPrincipalId: brandedUuid("PrincipalId").optional(),
  
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type PrepaymentApplication = z.infer<typeof PrepaymentApplicationSchema>;
