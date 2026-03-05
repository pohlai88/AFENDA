/**
 * Audit vocabulary — controlled action + entity-type strings.
 *
 * RULES:
 *   1. Every audit action follows `scope.entity.verb` namespacing.
 *   2. Every audit entity type matches one of the known domain entities.
 *   3. Adding a new action or entity type requires updating this file —
 *      free-string drift is caught by the type system.
 *   4. No Zod — this is pure vocabulary (like headers.ts).
 *
 * shared-exception: used by <infra/audit, api, worker> because audit is
 * an infrastructure cross-cut referenced by every domain.
 */

// ── Audit Actions ─────────────────────────────────────────────────────────────
// Namespaced: scope.entity.verb
// Extend this list as new commands are implemented.

export const AuditActionValues = [
  // Document / Evidence
  "document.registered",
  "evidence.attached",
  // Invoice (S1)
  "invoice.submitted",
  "invoice.approved",
  "invoice.rejected",
  "invoice.posted",
  "invoice.voided",
  // GL (S1)
  "gl.journal.posted",
  "gl.journal.reversed",
  // Supplier (S1)
  "supplier.created",
  "supplier.updated",
  "supplier.onboarding.approved",
  // IAM
  "iam.principal.created",
  "iam.role.assigned",
  "iam.role.revoked",
  "iam.org.created",
] as const;

export type AuditAction = (typeof AuditActionValues)[number];

// ── Audit Entity Types ────────────────────────────────────────────────────────
// Must match one of the known domain entity tables / concepts.

export const AuditEntityTypeValues = [
  "document",
  "evidence",
  "invoice",
  "journal_entry",
  "supplier",
  "principal",
  "role",
  "organization",
  "account",
] as const;

export type AuditEntityType = (typeof AuditEntityTypeValues)[number];
