import { index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import { PaymentBatchStatusValues } from "@afenda/contracts";
import { tsz, rlsOrg } from "../../../_helpers";
import { bankAccount } from "./bank-account";

export const paymentBatchStatusEnum = pgEnum(
  "payment_batch_status",
  PaymentBatchStatusValues,
);

export const treasuryPaymentBatch = pgTable(
  "treasury_payment_batch",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sourceBankAccountId: uuid("source_bank_account_id")
      .notNull()
      .references(() => bankAccount.id, { onDelete: "restrict" }),
    description: text("description"),
    status: paymentBatchStatusEnum("status").notNull().default("draft"),
    /** Total of all instruction amounts, stored as text for BigInt safety */
    totalAmountMinor: text("total_amount_minor").notNull().default("0"),
    itemCount: integer("item_count").notNull().default(0),
    requestedReleaseAt: tsz("requested_release_at"),
    approvedAt: tsz("approved_at"),
    releasedAt: tsz("released_at"),
    failedAt: tsz("failed_at"),
    failureReason: text("failure_reason"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("treasury_batch_org_status_idx").on(t.orgId, t.status),
    index("treasury_batch_org_account_idx").on(t.orgId, t.sourceBankAccountId),
    rlsOrg,
  ],
);
