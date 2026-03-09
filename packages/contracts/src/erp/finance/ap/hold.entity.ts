/**
 * AP Hold entity — blocks an invoice from being approved or paid.
 *
 * Hold types:
 *   - DUPLICATE: Potential duplicate invoice detected
 *   - PRICE_VARIANCE: Price doesn't match PO
 *   - QUANTITY_VARIANCE: Quantity doesn't match receipt
 *   - TAX_VARIANCE: Tax calculation mismatch
 *   - NEEDS_RECEIPT: Receipt not yet received
 *   - MANUAL: Manually placed hold
 *
 * RULES:
 *   1. An invoice can have multiple active holds.
 *   2. All holds must be released before approval.
 *   3. Holds are append-only — never deleted, only released.
 */
import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, InvoiceIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";

// ── Hold ID (branded type) ────────────────────────────────────────────────────

export const HoldIdSchema = z.string().uuid().brand<"HoldId">();
export type HoldId = z.infer<typeof HoldIdSchema>;

// ── Hold Type values ──────────────────────────────────────────────────────────

export const HoldTypeValues = [
  "DUPLICATE",
  "PRICE_VARIANCE",
  "QUANTITY_VARIANCE",
  "TAX_VARIANCE",
  "NEEDS_RECEIPT",
  "MANUAL",
] as const;

export type HoldType = (typeof HoldTypeValues)[number];

// ── Hold Status values ────────────────────────────────────────────────────────

export const HoldStatusValues = ["active", "released"] as const;

export type HoldStatus = (typeof HoldStatusValues)[number];

// ── Hold schema ───────────────────────────────────────────────────────────────

export const HoldSchema = z.object({
  id: HoldIdSchema,
  orgId: OrgIdSchema,
  invoiceId: InvoiceIdSchema,

  /** Type of hold (determines approval workflow) */
  holdType: z.enum(HoldTypeValues),

  /** Reason for the hold (human-readable) */
  holdReason: z.string().trim().min(1).max(500),

  /** Status: active or released */
  status: z.enum(HoldStatusValues),

  /** Who placed the hold */
  createdByPrincipalId: PrincipalIdSchema,

  /** When the hold was released (null if still active) */
  releasedAt: UtcDateTimeSchema.nullable(),

  /** Who released the hold (null if still active) */
  releasedByPrincipalId: PrincipalIdSchema.nullable(),

  /** Reason for release (null if still active) */
  releaseReason: z.string().trim().min(1).max(500).nullable(),

  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type Hold = z.infer<typeof HoldSchema>;
