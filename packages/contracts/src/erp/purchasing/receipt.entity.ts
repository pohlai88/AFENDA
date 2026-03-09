/**
 * Receipt (GRN) entity — for 3-way matching (PO → Receipt → Invoice).
 *
 * A receipt represents goods received against a purchase order.
 * amountMinor is the total received value used in threeWayMatch.
 */
import { z } from "zod";
import { OrgIdSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { PurchaseOrderIdSchema } from "./purchase-order.entity.js";

// ── Receipt ID ───────────────────────────────────────────────────────────────

export const ReceiptIdSchema = z.string().uuid().brand<"ReceiptId">();
export type ReceiptId = z.infer<typeof ReceiptIdSchema>;

// ── Status values ────────────────────────────────────────────────────────────

export const ReceiptStatusValues = ["draft", "received", "cancelled"] as const;

export type ReceiptStatus = (typeof ReceiptStatusValues)[number];

// ── Receipt schema ───────────────────────────────────────────────────────────

export const ReceiptSchema = z.object({
  id: ReceiptIdSchema,
  orgId: OrgIdSchema,
  purchaseOrderId: PurchaseOrderIdSchema,
  receiptNumber: z.string().min(1).max(50),
  amountMinor: z.bigint(),
  currencyCode: z.string().length(3),
  status: z.enum(ReceiptStatusValues),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type Receipt = z.infer<typeof ReceiptSchema>;
