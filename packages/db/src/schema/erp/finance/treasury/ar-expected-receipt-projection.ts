import { index, pgEnum, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import {
  ArExpectedReceiptMethodValues,
  ArExpectedReceiptProjectionStatusValues,
} from "@afenda/contracts";
import { organization } from "../../../kernel/identity";
import { tsz, rlsOrg } from "../../../_helpers";

export const arExpectedReceiptProjectionStatusEnum = pgEnum(
  "ar_expected_receipt_projection_status",
  ArExpectedReceiptProjectionStatusValues,
);

export const arExpectedReceiptMethodEnum = pgEnum(
  "ar_expected_receipt_method",
  ArExpectedReceiptMethodValues,
);

export const arExpectedReceiptProjection = pgTable(
  "ar_expected_receipt_projection",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sourceReceivableId: uuid("source_receivable_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    customerName: text("customer_name").notNull(),
    dueDate: text("due_date").notNull(),
    expectedReceiptDate: text("expected_receipt_date").notNull(),
    currencyCode: text("currency_code").notNull(),
    grossAmountMinor: text("gross_amount_minor").notNull(),
    openAmountMinor: text("open_amount_minor").notNull(),
    receiptMethod: arExpectedReceiptMethodEnum("receipt_method"),
    status: arExpectedReceiptProjectionStatusEnum("status").notNull().default("open"),
    sourceVersion: text("source_version").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("ar_expected_receipt_projection_org_source_uidx").on(
      t.orgId,
      t.sourceReceivableId,
      t.sourceVersion,
    ),
    index("ar_expected_receipt_projection_org_due_idx").on(t.orgId, t.dueDate),
    index("ar_expected_receipt_projection_org_status_idx").on(t.orgId, t.status),
    rlsOrg,
  ],
);
