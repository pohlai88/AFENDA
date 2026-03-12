import { pgTable, pgEnum, text, uuid, integer, bigint, index, unique } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import {
  BankStatementStatusValues,
  StatementLineStatusValues,
  CashMovementDirectionValues,
} from "@afenda/contracts";
import { tsz, rlsOrg } from "../../../_helpers";
import { bankAccount } from "./bank-account";

export const bankStatementStatusEnum = pgEnum("bank_statement_status", BankStatementStatusValues);
export const statementLineStatusEnum = pgEnum("statement_line_status", StatementLineStatusValues);
export const cashMovementDirectionEnum = pgEnum(
  "cash_movement_direction",
  CashMovementDirectionValues,
);

// ── bank_statement (header) ───────────────────────────────────────────────────

export const bankStatement = pgTable(
  "bank_statement",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    bankAccountId: uuid("bank_account_id")
      .notNull()
      .references(() => bankAccount.id, { onDelete: "restrict" }),
    /** Deduplication key supplied by caller (e.g. file hash). */
    sourceRef: text("source_ref").notNull(),
    statementDate: tsz("statement_date").notNull(),
    /** Opening balance in minor units (cents). */
    openingBalance: bigint("opening_balance", { mode: "bigint" }).notNull(),
    /** Closing balance in minor units (cents). */
    closingBalance: bigint("closing_balance", { mode: "bigint" }).notNull(),
    currencyCode: text("currency_code").notNull(),
    status: bankStatementStatusEnum("status").notNull().default("pending"),
    lineCount: integer("line_count").notNull().default(0),
    failureReason: text("failure_reason"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    /** Prevent double-ingestion of the same statement file for the same account. */
    unique("bank_statement_account_source_ref_uidx").on(t.bankAccountId, t.sourceRef),
    index("bank_statement_org_account_idx").on(t.orgId, t.bankAccountId),
    index("bank_statement_org_status_idx").on(t.orgId, t.status),
    index("bank_statement_org_date_idx").on(t.orgId, t.statementDate),
    rlsOrg,
  ],
);

// ── bank_statement_line ───────────────────────────────────────────────────────

export const bankStatementLine = pgTable(
  "bank_statement_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    statementId: uuid("statement_id")
      .notNull()
      .references(() => bankStatement.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull(),
    transactionDate: tsz("transaction_date").notNull(),
    valueDate: tsz("value_date"),
    description: text("description").notNull(),
    reference: text("reference"),
    /** Amount in minor units (cents). Always positive; direction carries sign. */
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    direction: cashMovementDirectionEnum("direction").notNull(),
    status: statementLineStatusEnum("status").notNull().default("unmatched"),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("bank_statement_line_statement_line_num_uidx").on(t.statementId, t.lineNumber),
    index("bank_statement_line_org_statement_idx").on(t.orgId, t.statementId),
    index("bank_statement_line_org_status_idx").on(t.orgId, t.status),
    index("bank_statement_line_org_tx_date_idx").on(t.orgId, t.transactionDate),
    rlsOrg,
  ],
);
