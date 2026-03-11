import {
  pgTable,
  pgEnum,
  text,
  uuid,
  bigint,
  boolean,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organization, iamPrincipal } from "../../kernel/identity";
import { AccountTypeValues } from "@afenda/contracts";
import { tsz, rlsOrg } from "../../_helpers";

export const accountTypeEnum = pgEnum("account_type", AccountTypeValues);

// ─────────────────────────────────────────────────────────────────────────────
// CHART OF ACCOUNTS (flat CoA — tree structure deferred)
// ─────────────────────────────────────────────────────────────────────────────
export const account = pgTable(
  "account",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    code: text("code").notNull(), // e.g. "1000" — format rules enforced in contracts
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [unique("account_org_code_uidx").on(t.orgId, t.code), rlsOrg],
);

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL (append-only — corrections via reversal entries)
// ─────────────────────────────────────────────────────────────────────────────
export const journalEntry = pgTable(
  "journal_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    entryNumber: text("entry_number").notNull(), // JE-2026-0001
    postedAt: tsz("posted_at").defaultNow().notNull(),
    memo: text("memo"),
    postedByPrincipalId: uuid("posted_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    correlationId: text("correlation_id").notNull(),
    // Stored for server-side deduplication; PostToGL + ReverseEntry commands carry it.
    idempotencyKey: text("idempotency_key"),
    sourceInvoiceId: uuid("source_invoice_id"),
    // Self-referential: which entry this one reverses (FK enforced via lambda)
    reversalOfId: uuid("reversal_of").references((): AnyPgColumn => journalEntry.id),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("journal_entry_org_number_uidx").on(t.orgId, t.entryNumber),
    index("journal_entry_source_invoice_idx").on(t.sourceInvoiceId),
    index("journal_entry_reversal_idx").on(t.reversalOfId),
    rlsOrg,
  ],
);

export const journalLine = pgTable(
  "journal_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntry.id),
    accountId: uuid("account_id")
      .notNull()
      .references(() => account.id),
    debitMinor: bigint("debit_minor", { mode: "bigint" })
      .notNull()
      .default(sql`0::bigint`),
    creditMinor: bigint("credit_minor", { mode: "bigint" })
      .notNull()
      .default(sql`0::bigint`),
    currencyCode: text("currency_code").notNull(),
    memo: text("memo"),
    // JSON-safe dimension bag (cost center, project, department).
    // Derivation rules live in packages/core, not here.
    dimensions: jsonb("dimensions").$type<Record<string, string>>(),
  },
  (t) => [
    index("journal_line_entry_idx").on(t.journalEntryId),
    index("journal_line_account_idx").on(t.accountId),
  ],
);
