/**
 * Relations — kernel/identity (party model + RBAC)
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
  authPasswordResetToken,
  authPortalInvitation,
} from "../../kernel/identity";
import { supplier } from "../../erp/supplier";
import { document } from "../../kernel/governance/evidence";
import { account, journalEntry } from "../../erp/finance/gl";
import { invoice, invoiceStatusHistory } from "../../erp/finance/ap";
import { outboxEvent } from "../../kernel/execution/outbox";
import { auditLog } from "../../kernel/governance/audit";
import { sequence } from "../../kernel/execution/numbering";
import { idempotency } from "../../kernel/execution/idempotency";

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
  portalInvitations: many(authPortalInvitation),
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
  passwordResetTokens: many(authPasswordResetToken),
  portalInvitationsSent: many(authPortalInvitation, { relationName: "portalInvitedBy" }),
  portalInvitationsAccepted: many(authPortalInvitation, { relationName: "portalAcceptedBy" }),
}));

export const authPasswordResetTokenRelations = relations(authPasswordResetToken, ({ one }) => ({
  principal: one(iamPrincipal, {
    fields: [authPasswordResetToken.principalId],
    references: [iamPrincipal.id],
  }),
}));

export const authPortalInvitationRelations = relations(authPortalInvitation, ({ one }) => ({
  organization: one(organization, {
    fields: [authPortalInvitation.orgId],
    references: [organization.id],
  }),
  invitedByPrincipal: one(iamPrincipal, {
    relationName: "portalInvitedBy",
    fields: [authPortalInvitation.invitedByPrincipalId],
    references: [iamPrincipal.id],
  }),
  acceptedPrincipal: one(iamPrincipal, {
    relationName: "portalAcceptedBy",
    fields: [authPortalInvitation.acceptedPrincipalId],
    references: [iamPrincipal.id],
  }),
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

export const iamRolePermissionRelations = relations(iamRolePermission, ({ one }) => ({
  role: one(iamRole, {
    fields: [iamRolePermission.roleId],
    references: [iamRole.id],
  }),
  permission: one(iamPermission, {
    fields: [iamRolePermission.permissionId],
    references: [iamPermission.id],
  }),
}));
