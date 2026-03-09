/**
 * PaymentRunItem entity — individual invoice payment within a payment run.
 *
 * Each item represents a payment to be made for a specific invoice.
 * Tracks amount paid, discount taken, and payment status.
 *
 * RULES:
 *   1. One item per invoice per payment run.
 *   2. Amount paid + discount must equal invoice amount.
 *   3. Items inherit the payment run's currency.
 *   4. Status transitions with the payment run (except for individual failures).
 */
import { z } from "zod";
import {
  OrgIdSchema,
  InvoiceIdSchema,
  SupplierIdSchema,
  brandedUuid,
} from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { PaymentRunIdSchema } from "./payment-run.entity.js";

// ── Branded ID ────────────────────────────────────────────────────────────────

export const PaymentRunItemIdSchema = brandedUuid("PaymentRunItemId");
export type PaymentRunItemId = z.infer<typeof PaymentRunItemIdSchema>;

// ── Status values ─────────────────────────────────────────────────────────────

export const PaymentRunItemStatusValues = [
  "PENDING",      // Awaiting payment run execution
  "PAID",         // Successfully paid
  "FAILED",       // Payment failed (retryable)
  "REVERSED",     // Payment reversed
  "EXCLUDED",     // Manually excluded from run
] as const;

export type PaymentRunItemStatus = (typeof PaymentRunItemStatusValues)[number];

// ── PaymentRunItem schema ─────────────────────────────────────────────────────

export const PaymentRunItemSchema = z.object({
  /** Unique identifier for the payment run item */
  id: PaymentRunItemIdSchema,
  /** Organization that owns this item */
  orgId: OrgIdSchema,
  /** Parent payment run */
  paymentRunId: PaymentRunIdSchema,

  /** The invoice being paid */
  invoiceId: InvoiceIdSchema,
  /** The supplier receiving payment (denormalized for reporting) */
  supplierId: SupplierIdSchema,

  /** Invoice number (denormalized for display) */
  invoiceNumber: z.string().trim().max(100),
  /** Invoice due date (denormalized for sorting) */
  invoiceDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  /** Original invoice amount in minor units */
  invoiceAmountMinor: z.bigint(),
  /** Amount being paid in minor units */
  amountPaidMinor: z.bigint(),
  /** Early payment discount taken in minor units */
  discountTakenMinor: z.bigint(),

  /** Current status */
  status: z.enum(PaymentRunItemStatusValues),

  /** Bank reference for this specific payment (if available) */
  paymentReference: z.string().trim().max(100).nullish(),
  /** Error message if payment failed */
  errorMessage: z.string().trim().max(500).nullish(),

  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type PaymentRunItem = z.infer<typeof PaymentRunItemSchema>;
