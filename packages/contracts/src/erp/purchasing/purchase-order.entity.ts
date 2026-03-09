/**
 * Purchase Order entity — for 3-way matching (PO → Receipt → Invoice).
 *
 * A PO represents an order placed with a supplier. The amountMinor is the
 * total ordered value (minor units) used in threeWayMatch(poAmount, receiptAmount, invoiceAmount).
 */
import { z } from "zod";
import { OrgIdSchema, SupplierIdSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";

// ── Purchase Order ID ─────────────────────────────────────────────────────────

export const PurchaseOrderIdSchema = z.string().uuid().brand<"PurchaseOrderId">();
export type PurchaseOrderId = z.infer<typeof PurchaseOrderIdSchema>;

// ── Status values (as const for DB enum + switch statements) ──────────────────

export const PurchaseOrderStatusValues = [
  "draft",
  "approved",
  "sent",
  "cancelled",
] as const;

export type PurchaseOrderStatus = (typeof PurchaseOrderStatusValues)[number];

// ── Purchase Order schema ─────────────────────────────────────────────────────

export const PurchaseOrderSchema = z.object({
  id: PurchaseOrderIdSchema,
  orgId: OrgIdSchema,
  supplierId: SupplierIdSchema,
  poNumber: z.string().min(1).max(50),
  amountMinor: z.bigint(),
  currencyCode: z.string().length(3),
  status: z.enum(PurchaseOrderStatusValues),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;
