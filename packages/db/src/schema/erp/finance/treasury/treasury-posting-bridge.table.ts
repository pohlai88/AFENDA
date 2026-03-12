import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const treasuryPostingBridgeTable = pgTable(
  "treasury_posting_bridge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    treasuryAccountingPolicyId: uuid("treasury_accounting_policy_id").notNull(),
    debitAccountCode: text("debit_account_code").notNull(),
    creditAccountCode: text("credit_account_code").notNull(),
    amountMinor: text("amount_minor").notNull(),
    currencyCode: text("currency_code").notNull(),
    status: text("status").notNull().default("requested"),
    correlationId: text("correlation_id").notNull(),
    postedJournalEntryId: uuid("posted_journal_entry_id"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index("treasury_posting_bridge__org_idx").on(table.orgId),
    orgSourceIdx: index("treasury_posting_bridge__org_source_idx").on(
      table.orgId,
      table.sourceType,
    ),
  }),
);
