/**
 * Relations — kernel/governance (document, evidence, audit)
 */
import { relations } from "drizzle-orm";
import { organization, iamPrincipal } from "../../kernel/identity";
import { document, evidence } from "../../kernel/governance/evidence";
import { auditLog } from "../../kernel/governance/audit";

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

// ── Audit ─────────────────────────────────────────────────────────────────────

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
