/**
 * Invoice Line schema for @afenda/contracts.
 *
 * RULES:
 *   1. Use branded IDs from shared/ids.ts.
 *   2. Use UtcDateTimeSchema for timestamps (not z.date()).
 *   3. Export *Values and *Schema separately — *Values is importable by @afenda/db.
 *   4. Add entity to the barrel: packages/contracts/src/<domain>/index.ts
 *   5. Add ENTITY_TYPE to AuditEntityTypeValues in kernel/governance/audit/actions.ts.
 */
import { z } from "zod";
import { OrgIdSchema, InvoiceIdSchema, AccountIdSchema, brandedUuid } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";

// ── Branded ID ────────────────────────────────────────────────────────────────

export const InvoiceLineIdSchema = brandedUuid("InvoiceLineId");
export type InvoiceLineId = z.infer<typeof InvoiceLineIdSchema>;

// ── Invoice Line schema ───────────────────────────────────────────────────────

export const InvoiceLineSchema = z.object({
  /** Unique identifier for the invoice line */
  id: InvoiceLineIdSchema,
  /** Organization that owns this invoice line */
  orgId: OrgIdSchema,
  /** Parent invoice */
  invoiceId: InvoiceIdSchema,
  /** Line number within the invoice (1-based) */
  lineNumber: z.number().int().positive(),
  /** Description of goods/services */
  description: z.string().trim().min(1).max(500),
  /** Quantity (integer, e.g., 10 units) */
  quantity: z.number().int().positive(),
  /** Unit price in minor units (cents). Use BigInt for precision. */
  unitPriceMinor: z.bigint(),
  /** Line total in minor units (quantity * unitPriceMinor). Calculated. */
  amountMinor: z.bigint(),
  /** GL account for expense coding (optional — can be set during approval) */
  glAccountId: AccountIdSchema.nullish(),
  /** Tax code (e.g., "VAT20", "EXEMPT"). Optional. */
  taxCode: z.string().trim().max(50).nullish(),
  /** When the record was created */
  createdAt: UtcDateTimeSchema,
  /** When the record was last updated */
  updatedAt: UtcDateTimeSchema,
});

export type InvoiceLine = z.infer<typeof InvoiceLineSchema>;
