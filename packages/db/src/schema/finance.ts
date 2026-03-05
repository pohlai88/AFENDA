import {
  pgTable, pgEnum, text, uuid, timestamp, date, bigint, boolean, jsonb, index, pgPolicy, unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "./iam.js";
import { supplier } from "./supplier.js";
import { InvoiceStatusValues, AccountTypeValues } from "@afenda/contracts";

// ─── RLS policy helper: org isolation via app.org_id GUC ──────────────────────
const rlsOrg = pgPolicy("org_isolation", {
  as: "permissive",
  for: "all",
  to: "public",
  using: sql`org_id = current_setting('app.org_id', true)::uuid`,
  withCheck: sql`org_id = current_setting('app.org_id', true)::uuid`,
});

export const invoiceStatusEnum = pgEnum("invoice_status", InvoiceStatusValues);
export const accountTypeEnum   = pgEnum("account_type",   AccountTypeValues);

const tsz = (name: string) => timestamp(name, { withTimezone: true });

// ─────────────────────────────────────────────────────────────────────────────
// CHART OF ACCOUNTS (flat CoA — tree structure deferred)
// ─────────────────────────────────────────────────────────────────────────────
export const account = pgTable(
  "account",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    code: text("code").notNull(),          // e.g. "1000" — format rules enforced in contracts (AccountCodeSchema)
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("account_org_code_uidx").on(t.orgId, t.code),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE (status append-only via invoice_status_history)
// ─────────────────────────────────────────────────────────────────────────────
export const invoice = pgTable(
  "invoice",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").notNull().references(() => supplier.id),
    invoiceNumber: text("invoice_number").notNull(), // INV-2026-0001
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currencyCode: text("currency_code").notNull(),
    // pgEnum keeps DB values in sync with InvoiceStatusValues; default is draft.
    status: invoiceStatusEnum("status").notNull().default("draft"),
    // Date-only (YYYY-MM-DD) — AP due dates have no meaningful time-of-day.
    dueDate: date("due_date"),
    submittedByPrincipalId: uuid("submitted_by_principal_id").references(() => iamPrincipal.id, { onDelete: "set null" }),
    // Null while invoice is in draft state; set once submitted.
    submittedAt: tsz("submitted_at"),
    poReference: text("po_reference"), // forward-compatible hook
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("invoice_org_number_uidx").on(t.orgId, t.invoiceNumber),
    index("invoice_org_status_idx").on(t.orgId, t.status),
    index("invoice_supplier_idx").on(t.orgId, t.supplierId),
    rlsOrg,
  ]
);

export const invoiceStatusHistory = pgTable(
  "invoice_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id").notNull().references(() => invoice.id),
    orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    fromStatus: invoiceStatusEnum("from_status"),
    toStatus: invoiceStatusEnum("to_status").notNull(),
    actorPrincipalId: uuid("actor_principal_id").references(() => iamPrincipal.id, { onDelete: "set null" }),
    correlationId: text("correlation_id").notNull(),
    reason: text("reason"),
    occurredAt: tsz("occurred_at").defaultNow().notNull(),
  },
  (t) => [
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL (append-only — corrections via reversal entries)
// ─────────────────────────────────────────────────────────────────────────────
export const journalEntry = pgTable(
  "journal_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    entryNumber: text("entry_number").notNull(), // JE-2026-0001
    postedAt: tsz("posted_at").defaultNow().notNull(),
    memo: text("memo"),
    postedByPrincipalId: uuid("posted_by_principal_id").references(() => iamPrincipal.id, { onDelete: "set null" }),
    correlationId: text("correlation_id").notNull(),
    // Stored for server-side deduplication; the PostToGL + ReverseEntry commands both carry it.
    idempotencyKey: text("idempotency_key"),
    sourceInvoiceId: uuid("source_invoice_id").references(() => invoice.id),
    // Self-referential: which entry this one reverses (FK enforced via lambda)
    reversalOfId: uuid("reversal_of").references(
      (): AnyPgColumn => journalEntry.id,
    ),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("journal_entry_org_number_uidx").on(t.orgId, t.entryNumber),
    rlsOrg,
  ],
);

export const journalLine = pgTable(
  "journal_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    journalEntryId: uuid("journal_entry_id").notNull().references(() => journalEntry.id),
    accountId: uuid("account_id").notNull().references(() => account.id),
    debitMinor: bigint("debit_minor", { mode: "bigint" }).notNull().default(0n),
    creditMinor: bigint("credit_minor", { mode: "bigint" }).notNull().default(0n),
    currencyCode: text("currency_code").notNull(),
    memo: text("memo"),
    // JSON-safe dimension bag (cost center, project, department).
    // Derivation rules live in packages/core, not here.
    dimensions: jsonb("dimensions").$type<Record<string, string>>(),
  },
  (t) => [
    index("journal_line_entry_idx").on(t.journalEntryId),
    index("journal_line_account_idx").on(t.accountId),
  ]
);
