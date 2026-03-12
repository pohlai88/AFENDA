import { date, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const treasuryAccountingPolicyTable = pgTable(
  "treasury_accounting_policy",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    policyCode: text("policy_code").notNull(),
    name: text("name").notNull(),
    scopeType: text("scope_type").notNull(),
    debitAccountCode: text("debit_account_code").notNull(),
    creditAccountCode: text("credit_account_code").notNull(),
    status: text("status").notNull().default("draft"),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index("treasury_accounting_policy__org_idx").on(table.orgId),
    orgCodeUq: uniqueIndex("treasury_accounting_policy__org_code_uq").on(
      table.orgId,
      table.policyCode,
    ),
  }),
);
