/**
 * Payment Terms entity — defines payment due dates and early payment discounts.
 *
 * Examples:
 *   - "NET30" → Due in 30 days, no discount
 *   - "2/10NET30" → 2% discount if paid within 10 days, otherwise due in 30 days
 *   - "NET45" → Due in 45 days, no discount
 *
 * RULES:
 *   1. `code` is unique per org (e.g., "NET30", "2/10NET30").
 *   2. `discountPercent` and `discountDays` are optional — null means no early discount.
 *   3. Import PaymentTermsStatusValues in @afenda/db for the pgEnum.
 */
import { z } from "zod";
import { OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";

// ── Payment Terms ID (branded type) ───────────────────────────────────────────

export const PaymentTermsIdSchema = z.string().uuid().brand<"PaymentTermsId">();
export type PaymentTermsId = z.infer<typeof PaymentTermsIdSchema>;

// ── Status values (as const for DB enum + switch statements) ──────────────────

export const PaymentTermsStatusValues = ["active", "inactive"] as const;

export type PaymentTermsStatus = (typeof PaymentTermsStatusValues)[number];

// ── PaymentTerms schema ───────────────────────────────────────────────────────

export const PaymentTermsSchema = z.object({
  id: PaymentTermsIdSchema,
  orgId: OrgIdSchema,

  /** Unique code within org, e.g., "NET30", "2/10NET30" */
  code: z.string().trim().min(1).max(32),

  /** Human-readable description, e.g., "Net 30 days" */
  description: z.string().trim().min(1).max(255),

  /** Days until payment is due (from invoice date) */
  netDays: z.number().int().min(0).max(365),

  /** Early payment discount percentage (e.g., 2 for 2%). Null = no discount. */
  discountPercent: z.number().min(0).max(100).nullable(),

  /** Days within which the discount applies. Null = no discount. */
  discountDays: z.number().int().min(0).max(365).nullable(),

  status: z.enum(PaymentTermsStatusValues),

  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type PaymentTerms = z.infer<typeof PaymentTermsSchema>;
