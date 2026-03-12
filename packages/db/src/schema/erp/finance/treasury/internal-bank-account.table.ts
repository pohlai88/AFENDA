import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  internalBankAccountStatusValues,
  internalBankAccountTypeValues,
} from "@afenda/contracts";

export const internalBankAccountStatusEnum = pgEnum(
  "treasury_internal_bank_account_status",
  internalBankAccountStatusValues
);

export const internalBankAccountTypeEnum = pgEnum(
  "treasury_internal_bank_account_type",
  internalBankAccountTypeValues
);

export const treasuryInternalBankAccountTable = pgTable(
  "treasury_internal_bank_account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    code: text("code").notNull(),
    accountName: text("account_name").notNull(),
    accountType: internalBankAccountTypeEnum("account_type").notNull(),
    currencyCode: text("currency_code").notNull(),
    externalBankAccountId: uuid("external_bank_account_id"),
    status: internalBankAccountStatusEnum("status").notNull().default("draft"),
    isPrimaryFundingAccount: boolean("is_primary_funding_account")
      .notNull()
      .default(false),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("treasury_internal_bank_account__org_idx").on(table.orgId),
    orgCodeUq: uniqueIndex("treasury_internal_bank_account__org_code_uq").on(
      table.orgId,
      table.code
    ),
    orgEntityIdx: index("treasury_internal_bank_account__org_entity_idx").on(
      table.orgId,
      table.legalEntityId
    ),
  })
);
