/**
 * PaymentRun entity — batch payment execution for AP invoices.
 *
 * A payment run groups multiple invoices for efficient payment processing.
 * Supports early payment discount calculation and payment file generation.
 *
 * Lifecycle:
 *   DRAFT → APPROVED → EXECUTING → EXECUTED
 *                   ↘ CANCELLED
 *   EXECUTED → REVERSED (exceptional case)
 *
 * RULES:
 *   1. A payment run can only be executed once.
 *   2. All items must be in the same currency as the payment run.
 *   3. Reversing a run reverses all item payments and restores invoice statuses.
 *   4. Payment runs are immutable after execution (append-only audit trail).
 */
import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, brandedUuid } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";

// ── Branded ID ────────────────────────────────────────────────────────────────

export const PaymentRunIdSchema = brandedUuid("PaymentRunId");
export type PaymentRunId = z.infer<typeof PaymentRunIdSchema>;

// ── Payment Method values ─────────────────────────────────────────────────────

export const PaymentMethodValues = [
  "ACH",          // US domestic ACH transfer
  "WIRE",         // Wire transfer (domestic or international)
  "CHECK",        // Physical check
  "CARD",         // Virtual card / corporate card
  "SEPA",         // SEPA credit transfer (EU)
  "SWIFT",        // International SWIFT transfer
] as const;

export type PaymentMethod = (typeof PaymentMethodValues)[number];

// ── Status values ─────────────────────────────────────────────────────────────

export const PaymentRunStatusValues = [
  "DRAFT",        // Being assembled, items can be added/removed
  "APPROVED",     // Approved for execution, locked for changes
  "EXECUTING",    // Payment file generated, awaiting bank confirmation
  "EXECUTED",     // Payments sent successfully
  "CANCELLED",    // Cancelled before execution
  "REVERSED",     // All payments reversed (exceptional)
] as const;

export type PaymentRunStatus = (typeof PaymentRunStatusValues)[number];

// ── PaymentRun schema ─────────────────────────────────────────────────────────

export const PaymentRunSchema = z.object({
  /** Unique identifier for the payment run */
  id: PaymentRunIdSchema,
  /** Organization that owns this payment run */
  orgId: OrgIdSchema,

  /** Human-readable run number (e.g., "PR-2026-0001") */
  runNumber: z.string().trim().min(1).max(50),
  /** Optional description/notes */
  description: z.string().trim().max(500).nullish(),

  /** Payment method for this run */
  paymentMethod: z.enum(PaymentMethodValues),
  /** ISO 4217 currency code (all items must match) */
  currencyCode: z.string().length(3).toUpperCase(),

  /** Scheduled payment date (YYYY-MM-DD) */
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  /** Total amount in minor units (sum of all items) */
  totalAmountMinor: z.bigint(),
  /** Total early payment discount taken in minor units */
  totalDiscountMinor: z.bigint(),
  /** Number of items in this run */
  itemCount: z.number().int().nonnegative(),

  /** Current status */
  status: z.enum(PaymentRunStatusValues),

  // Approval tracking
  /** Principal who approved the run */
  approvedByPrincipalId: PrincipalIdSchema.nullish(),
  /** When the run was approved */
  approvedAt: UtcDateTimeSchema.nullish(),

  // Execution tracking
  /** Principal who executed the run */
  executedByPrincipalId: PrincipalIdSchema.nullish(),
  /** When the run was executed */
  executedAt: UtcDateTimeSchema.nullish(),
  /** Bank reference/confirmation number */
  bankReference: z.string().trim().max(100).nullish(),

  // Reversal tracking
  /** Principal who reversed the run */
  reversedByPrincipalId: PrincipalIdSchema.nullish(),
  /** When the run was reversed */
  reversedAt: UtcDateTimeSchema.nullish(),
  /** Reason for reversal */
  reversalReason: z.string().trim().max(500).nullish(),

  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type PaymentRun = z.infer<typeof PaymentRunSchema>;
