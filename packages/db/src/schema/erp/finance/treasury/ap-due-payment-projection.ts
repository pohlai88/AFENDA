import { index, pgEnum, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import {
  ApDuePaymentMethodValues,
  ApDuePaymentProjectionStatusValues,
} from "@afenda/contracts";
import { organization } from "../../../kernel/identity";
import { tsz, rlsOrg } from "../../../_helpers";

export const apDuePaymentProjectionStatusEnum = pgEnum(
  "ap_due_payment_projection_status",
  ApDuePaymentProjectionStatusValues,
);

export const apDuePaymentMethodEnum = pgEnum(
  "ap_due_payment_method",
  ApDuePaymentMethodValues,
);

export const apDuePaymentProjection = pgTable(
  "ap_due_payment_projection",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sourcePayableId: uuid("source_payable_id").notNull(),
    supplierId: uuid("supplier_id").notNull(),
    supplierName: text("supplier_name").notNull(),
    paymentTermCode: text("payment_term_code"),
    dueDate: text("due_date").notNull(),
    expectedPaymentDate: text("expected_payment_date").notNull(),
    currencyCode: text("currency_code").notNull(),
    grossAmountMinor: text("gross_amount_minor").notNull(),
    openAmountMinor: text("open_amount_minor").notNull(),
    paymentMethod: apDuePaymentMethodEnum("payment_method"),
    status: apDuePaymentProjectionStatusEnum("status").notNull().default("open"),
    sourceVersion: text("source_version").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("ap_due_payment_projection_org_source_uidx").on(
      t.orgId,
      t.sourcePayableId,
      t.sourceVersion,
    ),
    index("ap_due_payment_projection_org_due_idx").on(t.orgId, t.dueDate),
    index("ap_due_payment_projection_org_status_idx").on(t.orgId, t.status),
    rlsOrg,
  ],
);
