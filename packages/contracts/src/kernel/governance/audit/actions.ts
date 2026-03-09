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
  "invoice.created",
  "invoice.submitted",
  "invoice.approved",
  "invoice.rejected",
  "invoice.posted",
  "invoice.voided",
  "invoice.paid",
  // Payment Terms
  "payment-terms.created",
  "payment-terms.updated",
  // AP Holds
  "hold.created",
  "hold.released",
  // Invoice Lines
  "invoice-line.created",
  "invoice-line.updated",
  "invoice-line.deleted",
  // Payment Runs
  "payment-run.created",
  "payment-run.updated",
  "payment-run.approved",
  "payment-run.executed",
  "payment-run.cancelled",
  "payment-run.reversed",
  // Payment Run Items
  "payment-run-item.added",
  "payment-run-item.updated",
  "payment-run-item.removed",
  "payment-run-item.excluded",
  "payment-run-item.paid",
  "payment-run-item.failed",
  // Prepayments
  "prepayment.created",
  "prepayment.applied",
  "prepayment.voided",
  // Prepayment Applications
  "prepayment-application.created",
  // Match Tolerances
  "match-tolerance.created",
  "match-tolerance.updated",
  "match-tolerance.deactivated",
  // WHT Certificates
  "wht-certificate.created",
  "wht-certificate.issued",
  "wht-certificate.submitted",
  "wht-certificate.voided",
  // WHT Exemptions
  "wht-exemption.created",
  "wht-exemption.updated",
  "wht-exemption.deactivated",
  // GL (S1)
  "gl.journal.posted",
  "gl.journal.reversed",
  // Purchase Order (3-way matching)
  "purchase-order.created",
  "receipt.created",

  // Supplier (S1)
  "supplier.created",
  "supplier.updated",
  "supplier.onboarding.approved",
  // Supplier Sites
  "supplier-site.created",
  "supplier-site.updated",
  "supplier-site.deactivated",
  "supplier-site.set-primary",
  // Supplier Bank Accounts
  "supplier-bank-account.created",
  "supplier-bank-account.updated",
  "supplier-bank-account.verified",
  "supplier-bank-account.deactivated",
  "supplier-bank-account.set-primary",
  // IAM
  "iam.principal.created",
  "iam.role.assigned",
  "iam.role.revoked",
  "iam.org.created",
  // Settings
  "settings.updated",
  // Custom Fields (Phase 3)
  "custom-fields.created",
  "custom-fields.updated",
  "custom-fields.deactivated",
  "custom-fields.deleted",
  "custom-fields.values.updated",
] as const;

export type AuditAction = (typeof AuditActionValues)[number];

// ── Audit Entity Types ────────────────────────────────────────────────────────
// Must match one of the known domain entity tables / concepts.

export const AuditEntityTypeValues = [
  "document",
  "evidence",
  "invoice",
  "invoice_line",
  "payment_terms",
  "hold",
  "payment_run",
  "payment_run_item",
  "prepayment",
  "prepayment_application",
  "match_tolerance",
  "wht_certificate",
  "wht_exemption",
  "journal_entry",
  "purchase_order",
  "receipt",
  "supplier",
  "supplier_site",
  "supplier_bank_account",
  "principal",
  "role",
  "organization",
  "account",
  "payment",
  "setting",
  "custom_field_def",
  "custom_field_value",
] as const;

export type AuditEntityType = (typeof AuditEntityTypeValues)[number];
