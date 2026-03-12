import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import {
  intercompanyTransferStatusValues,
  intercompanyTransferPurposeValues,
} from "@afenda/contracts";

export const intercompanyTransferStatusEnum = pgEnum(
  "treasury_intercompany_transfer_status",
  intercompanyTransferStatusValues
);

export const intercompanyTransferPurposeEnum = pgEnum(
  "treasury_intercompany_transfer_purpose",
  intercompanyTransferPurposeValues
);

export const treasuryIntercompanyTransferTable = pgTable(
  "treasury_intercompany_transfer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    transferNumber: text("transfer_number").notNull(),
    fromLegalEntityId: uuid("from_legal_entity_id").notNull(),
    toLegalEntityId: uuid("to_legal_entity_id").notNull(),
    fromInternalBankAccountId: uuid("from_internal_bank_account_id").notNull(),
    toInternalBankAccountId: uuid("to_internal_bank_account_id").notNull(),
    purpose: intercompanyTransferPurposeEnum("purpose").notNull(),
    currencyCode: text("currency_code").notNull(),
    transferAmountMinor: text("transfer_amount_minor").notNull(),
    debitLegAmountMinor: text("debit_leg_amount_minor").notNull(),
    creditLegAmountMinor: text("credit_leg_amount_minor").notNull(),
    requestedExecutionDate: date("requested_execution_date").notNull(),
    status: intercompanyTransferStatusEnum("status").notNull().default("draft"),
    makerUserId: uuid("maker_user_id").notNull(),
    checkerUserId: uuid("checker_user_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    sourceVersion: text("source_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("treasury_intercompany_transfer__org_idx").on(table.orgId),
    orgTransferNumberUq: uniqueIndex(
      "treasury_intercompany_transfer__org_transfer_number_uq"
    ).on(table.orgId, table.transferNumber),
    orgStatusIdx: index("treasury_intercompany_transfer__org_status_idx").on(
      table.orgId,
      table.status
    ),
    orgFromToIdx: index(
      "treasury_intercompany_transfer__org_from_to_idx"
    ).on(table.orgId, table.fromLegalEntityId, table.toLegalEntityId),
  })
);
