/**
 * Relations — erp/finance (accounts, invoices, journals)
 */
import { relations } from "drizzle-orm";
import { organization, iamPrincipal } from "../../kernel/identity";
import { supplier } from "../../erp/supplier";
import { account, journalEntry, journalLine } from "../../erp/finance/gl";
import { invoice, invoiceStatusHistory } from "../../erp/finance/ap";

// ── Accounts ──────────────────────────────────────────────────────────────────

export const accountRelations = relations(account, ({ one, many }) => ({
  organization: one(organization, {
    fields: [account.orgId],
    references: [organization.id],
  }),
  journalLines: many(journalLine),
}));

// ── Invoices ──────────────────────────────────────────────────────────────────

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
  organization: one(organization, {
    fields: [invoice.orgId],
    references: [organization.id],
  }),
  supplier: one(supplier, {
    fields: [invoice.supplierId],
    references: [supplier.id],
  }),
  submittedBy: one(iamPrincipal, {
    fields: [invoice.submittedByPrincipalId],
    references: [iamPrincipal.id],
    relationName: "submittedBy",
  }),
  statusHistory: many(invoiceStatusHistory),
  // Journal entries that were created from this invoice
  journals: many(journalEntry),
}));

export const invoiceStatusHistoryRelations = relations(invoiceStatusHistory, ({ one }) => ({
  invoice: one(invoice, {
    fields: [invoiceStatusHistory.invoiceId],
    references: [invoice.id],
  }),
  organization: one(organization, {
    fields: [invoiceStatusHistory.orgId],
    references: [organization.id],
  }),
  actor: one(iamPrincipal, {
    fields: [invoiceStatusHistory.actorPrincipalId],
    references: [iamPrincipal.id],
  }),
}));

// ── Journal ───────────────────────────────────────────────────────────────────

export const journalEntryRelations = relations(journalEntry, ({ one, many }) => ({
  organization: one(organization, {
    fields: [journalEntry.orgId],
    references: [organization.id],
  }),
  postedBy: one(iamPrincipal, {
    fields: [journalEntry.postedByPrincipalId],
    references: [iamPrincipal.id],
  }),
  sourceInvoice: one(invoice, {
    fields: [journalEntry.sourceInvoiceId],
    references: [invoice.id],
  }),
  // Self-referential: the entry this one reverses
  reversalOf: one(journalEntry, {
    fields: [journalEntry.reversalOfId],
    references: [journalEntry.id],
    relationName: "reversals",
  }),
  // Entries that reverse this one
  reversals: many(journalEntry, { relationName: "reversals" }),
  lines: many(journalLine),
}));

export const journalLineRelations = relations(journalLine, ({ one }) => ({
  entry: one(journalEntry, {
    fields: [journalLine.journalEntryId],
    references: [journalEntry.id],
  }),
  account: one(account, {
    fields: [journalLine.accountId],
    references: [account.id],
  }),
}));
