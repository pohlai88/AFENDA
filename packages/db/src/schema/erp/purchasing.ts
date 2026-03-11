/**
 * Purchase Order and Receipt schemas — for 3-way matching (PO → Receipt → Invoice).
 */
import { pgTable, pgEnum, text, uuid, bigint, unique, index } from "drizzle-orm/pg-core";
import { organization } from "../kernel/identity";
import { supplier } from "./supplier";
import {
  PurchaseOrderStatusValues,
  ReceiptStatusValues,
} from "@afenda/contracts";
import { tsz, rlsOrg } from "../_helpers";

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", PurchaseOrderStatusValues);
export const receiptStatusEnum = pgEnum("receipt_status", ReceiptStatusValues);

export const purchaseOrder = pgTable(
  "purchase_order",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id, { onDelete: "restrict" }),
    poNumber: text("po_number").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currencyCode: text("currency_code").notNull(),
    status: purchaseOrderStatusEnum("status").notNull().default("draft"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("purchase_order_org_number_uidx").on(t.orgId, t.poNumber),
    index("purchase_order_org_status_idx").on(t.orgId, t.status),
    index("purchase_order_supplier_idx").on(t.orgId, t.supplierId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT (GRN) — goods received against a PO
// ─────────────────────────────────────────────────────────────────────────────

export const receipt = pgTable(
  "receipt",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrder.id, { onDelete: "restrict" }),
    receiptNumber: text("receipt_number").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currencyCode: text("currency_code").notNull(),
    status: receiptStatusEnum("status").notNull().default("draft"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("receipt_org_number_uidx").on(t.orgId, t.receiptNumber),
    index("receipt_org_status_idx").on(t.orgId, t.status),
    index("receipt_po_idx").on(t.orgId, t.purchaseOrderId),
    rlsOrg,
  ],
);
