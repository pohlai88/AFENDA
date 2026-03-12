import { pgTable, pgEnum, text, uuid, boolean, index, unique } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import { BankAccountStatusValues } from "@afenda/contracts";
import { tsz, rlsOrg } from "../../../_helpers";

export const bankAccountStatusEnum = pgEnum("bank_account_status", BankAccountStatusValues);

export const bankAccount = pgTable(
  "bank_account",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    accountName: text("account_name").notNull(),
    bankName: text("bank_name").notNull(),
    accountNumber: text("account_number").notNull(),
    currencyCode: text("currency_code").notNull(),
    bankIdentifierCode: text("bank_identifier_code"),
    externalBankRef: text("external_bank_ref"),
    status: bankAccountStatusEnum("status").notNull().default("inactive"),
    isPrimary: boolean("is_primary").notNull().default(false),
    activatedAt: tsz("activated_at"),
    deactivatedAt: tsz("deactivated_at"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("bank_account_org_account_number_uidx").on(t.orgId, t.accountNumber),
    index("bank_account_org_status_idx").on(t.orgId, t.status),
    index("bank_account_org_bank_identifier_idx").on(t.orgId, t.bankIdentifierCode),
    index("bank_account_org_external_ref_idx").on(t.orgId, t.externalBankRef),
    rlsOrg,
  ],
);
