/**
 * Drizzle relational query definitions.
 *
 * These power `db.query.<table>.findMany({ with: { ... } })`.
 * Every FK in the schema must have a corresponding relation here,
 * or the relational API will silently return no related data.
 *
 * Naming convention:
 *   - `one(...)` for the FK side (child → parent)
 *   - `many(...)` for the inverse (parent → children)
 * 
 * Updated for ADR-0003 Phase 4: uses organization, iamPrincipal, partyRole, membership
 */

import { relations } from "drizzle-orm";
import {
  party,
  person,
  organization,
  iamPrincipal,
  partyRole,
  membership,
  iamRole,
  iamPermission,
  iamPrincipalRole,
  iamRolePermission,
} from "./iam.js";
import { supplier } from "./supplier.js";
import { document, evidence } from "./document.js";
import {
  account,
  invoice,
  invoiceStatusHistory,
  journalEntry,
  journalLine,
} from "./finance.js";
import {
  outboxEvent,
  idempotency,
  auditLog,
  sequence,
} from "./infra.js";

// ── Party Model (ADR-0003) ────────────────────────────────────────────────────

export const partyRelations = relations(party, ({ one }) => ({
  person: one(person),
  organization: one(organization),
}));

export const personRelations = relations(person, ({ one, many }) => ({
  party: one(party, {
    fields: [person.id],
    references: [party.id],
  }),
  principals: many(iamPrincipal),
  partyRoles: many(partyRole),
}));

export const organizationRelations = relations(organization, ({ one, many }) => ({
  party: one(party, {
    fields: [organization.id],
    references: [party.id],
  }),
  partyRoles: many(partyRole),
  iamRoles: many(iamRole),
  // Business entity relations
  suppliersBuyer: many(supplier, { relationName: "buyerOrg" }),
  suppliersCounterparty: many(supplier, { relationName: "supplierOrg" }),
  documents: many(document),
  accounts: many(account),
  invoices: many(invoice),
  journalEntries: many(journalEntry),
  outboxEvents: many(outboxEvent),
  auditLogs: many(auditLog),
  sequences: many(sequence),
  idempotencyKeys: many(idempotency),
}));

// ── IAM Principal ─────────────────────────────────────────────────────────────

export const iamPrincipalRelations = relations(iamPrincipal, ({ one, many }) => ({
  person: one(person, {
    fields: [iamPrincipal.personId],
    references: [person.id],
  }),
  memberships: many(membership),
  principalRoles: many(iamPrincipalRole),
  uploadedDocuments: many(document),
  submittedInvoices: many(invoice, { relationName: "submittedBy" }),
  onboardedSuppliers: many(supplier),
  auditLogs: many(auditLog),
  statusChanges: many(invoiceStatusHistory),
  postedJournals: many(journalEntry),
}));

// ── Party Role + Membership ───────────────────────────────────────────────────

export const partyRoleRelations = relations(partyRole, ({ one, many }) => ({
  organization: one(organization, {
    fields: [partyRole.orgId],
    references: [organization.id],
  }),
  party: one(party, {
    fields: [partyRole.partyId],
    references: [party.id],
  }),
  memberships: many(membership),
}));

export const membershipRelations = relations(membership, ({ one }) => ({
  principal: one(iamPrincipal, {
    fields: [membership.principalId],
    references: [iamPrincipal.id],
  }),
  partyRole: one(partyRole, {
    fields: [membership.partyRoleId],
    references: [partyRole.id],
  }),
}));

// ── IAM Role ──────────────────────────────────────────────────────────────────

export const iamRoleRelations = relations(iamRole, ({ one, many }) => ({
  organization: one(organization, {
    fields: [iamRole.orgId],
    references: [organization.id],
  }),
  principalRoles: many(iamPrincipalRole),
  rolePermissions: many(iamRolePermission),
}));

// ── IAM Permission ────────────────────────────────────────────────────────────

export const iamPermissionRelations = relations(iamPermission, ({ many }) => ({
  rolePermissions: many(iamRolePermission),
}));

// ── IAM junctions ─────────────────────────────────────────────────────────────

export const iamPrincipalRoleRelations = relations(iamPrincipalRole, ({ one }) => ({
  organization: one(organization, {
    fields: [iamPrincipalRole.orgId],
    references: [organization.id],
  }),
  principal: one(iamPrincipal, {
    fields: [iamPrincipalRole.principalId],
    references: [iamPrincipal.id],
  }),
  role: one(iamRole, {
    fields: [iamPrincipalRole.roleId],
    references: [iamRole.id],
  }),
}));

export const iamRolePermissionRelations = relations(
  iamRolePermission,
  ({ one }) => ({
    role: one(iamRole, {
      fields: [iamRolePermission.roleId],
      references: [iamRole.id],
    }),
    permission: one(iamPermission, {
      fields: [iamRolePermission.permissionId],
      references: [iamPermission.id],
    }),
  }),
);

// ── Supplier ──────────────────────────────────────────────────────────────────

export const supplierRelations = relations(supplier, ({ one, many }) => ({
  // The buying organisation that owns this supplier record
  organization: one(organization, {
    fields: [supplier.orgId],
    references: [organization.id],
    relationName: "buyerOrg",
  }),
  // The supplier's own organization identity (counterparty)
  supplierOrg: one(organization, {
    fields: [supplier.supplierOrgId],
    references: [organization.id],
    relationName: "supplierOrg",
  }),
  onboardedBy: one(iamPrincipal, {
    fields: [supplier.onboardedByPrincipalId],
    references: [iamPrincipal.id],
  }),
  invoices: many(invoice),
}));

// ── Document + Evidence ───────────────────────────────────────────────────────

export const documentRelations = relations(document, ({ one, many }) => ({
  organization: one(organization, {
    fields: [document.orgId],
    references: [organization.id],
  }),
  uploadedBy: one(iamPrincipal, {
    fields: [document.uploadedByPrincipalId],
    references: [iamPrincipal.id],
  }),
  evidences: many(evidence),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  organization: one(organization, {
    fields: [evidence.orgId],
    references: [organization.id],
  }),
  document: one(document, {
    fields: [evidence.documentId],
    references: [document.id],
  }),
}));

// ── Finance ───────────────────────────────────────────────────────────────────

export const accountRelations = relations(account, ({ one, many }) => ({
  organization: one(organization, {
    fields: [account.orgId],
    references: [organization.id],
  }),
  journalLines: many(journalLine),
}));

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

export const invoiceStatusHistoryRelations = relations(
  invoiceStatusHistory,
  ({ one }) => ({
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
  }),
);

export const journalEntryRelations = relations(
  journalEntry,
  ({ one, many }) => ({
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
  }),
);

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

// ── Infra ─────────────────────────────────────────────────────────────────────

export const outboxEventRelations = relations(outboxEvent, ({ one }) => ({
  organization: one(organization, {
    fields: [outboxEvent.orgId],
    references: [organization.id],
  }),
}));

export const idempotencyRelations = relations(idempotency, ({ one }) => ({
  organization: one(organization, {
    fields: [idempotency.orgId],
    references: [organization.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  organization: one(organization, {
    fields: [auditLog.orgId],
    references: [organization.id],
  }),
  actor: one(iamPrincipal, {
    fields: [auditLog.actorPrincipalId],
    references: [iamPrincipal.id],
  }),
}));

export const sequenceRelations = relations(sequence, ({ one }) => ({
  organization: one(organization, {
    fields: [sequence.orgId],
    references: [organization.id],
  }),
}));
