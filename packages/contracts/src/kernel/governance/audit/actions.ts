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
  // Treasury
  "treasury.bank-account.created",
  "treasury.bank-account.updated",
  "treasury.bank-account.activated",
  "treasury.bank-account.deactivated",
  "treasury.bank-statement.ingested",
  "treasury.reconciliation-session.opened",
  "treasury.reconciliation-session.matched",
  "treasury.reconciliation-session.closed",
  "treasury.payment-batch.created",
  "treasury.payment-batch.approved",
  "treasury.payment-batch.released",
  "treasury.payment-batch.request-release",
  "treasury.reconciliation-session.match-added",
  "treasury.reconciliation-session.match-removed",
  "treasury.payment-instruction.created",
  "treasury.payment-instruction.submitted",
  "treasury.payment-instruction.approved",
  "treasury.payment-instruction.rejected",
  "treasury.cash-position.snapshot-requested",
  "treasury.cash-position.snapshot-superseded",
  "treasury.liquidity-scenario.created",
  "treasury.liquidity-scenario.activated",
  "treasury.liquidity-forecast.calculated",
  "treasury.ap-due-payment-projection.upserted",
  "treasury.ar-expected-receipt-projection.upserted",
  "treasury.liquidity-source-feed.upserted",
  "treasury.fx-rate-snapshot.upserted",
  "treasury.forecast-variance.recorded",
  // Treasury — Wave 4.1 In-house Banking + Intercompany Transfers
  "treasury.internal-bank-account.created",
  "treasury.internal-bank-account.activated",
  "treasury.internal-bank-account.deactivated",
  "treasury.intercompany-transfer.created",
  "treasury.intercompany-transfer.submitted",
  "treasury.intercompany-transfer.approved",
  "treasury.intercompany-transfer.rejected",
  "treasury.intercompany-transfer.settled",

  // COMM — shared
  "comment.created",
  "comment.edited",
  "comment.deleted",
  "mention.created",
  "label.created",
  "label.updated",
  "label.deleted",
  "label.assigned",
  "label.unassigned",
  "saved_view.created",
  "saved_view.deleted",
  "subscription.created",
  "subscription.deleted",
  "inbox_item.read",
  "inbox_item.read_all",
  "notification_preference.updated",

  // COMM — tasks
  "task.created",
  "task.updated",
  "task.assigned",
  "task.status_changed",
  "task.completed",
  "task.archived",
  "task.checklist_added",
  "task.checklist_toggled",
  "task.time_logged",
  "task.bulk_assigned",
  "task.bulk_transitioned",

  // COMM — projects
  "project.created",
  "project.updated",
  "project.status_changed",
  "project.archived",
  "project.member_added",
  "project.member_removed",
  "project.milestone_created",
  "project.milestone_completed",

  // COMM — approvals
  "approval.requested",
  "approval.step_approved",
  "approval.step_rejected",
  "approval.step_delegated",
  "approval.escalated",
  "approval.withdrawn",
  "approval.auto_approved",
  "approval_policy.created",
  "approval_policy.updated",
  "approval_delegation.created",

  // COMM — announcements
  "announcement.created",
  "announcement.published",
  "announcement.scheduled",
  "announcement.archived",
  "announcement.acknowledged",

  // COMM — docs
  "document.created",
  "document.updated",
  "document.published",
  "document.archived",
  "document.collaborator.added",
  "document.collaborator.removed",

  // COMM — boardroom
  "meeting.created",
  "meeting.updated",
  "meeting.agenda_item_added",
  "meeting.attendee_added",
  "meeting.attendee_status_updated",
  "meeting.resolution_proposed",
  "meeting.vote_cast",
  "meeting.minutes_recorded",
  "meeting.action_item_created",
  "meeting.action_item_updated",

  // COMM — workflows
  "workflow.created",
  "workflow.updated",
  "workflow.status_changed",
  "workflow.deleted",
  "workflow.triggered",
  "workflow.run_completed",
  "workflow.run_failed",
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
  // Treasury
  "bank_account",
  "bank_statement",
  "bank_statement_line",
  "reconciliation_session",
  "treasury_payment_batch",
  "treasury_payment_instruction",
  "cash_position_snapshot",
  "reconciliation_match",
  "liquidity_scenario",
  "liquidity_forecast",
  "ap_due_payment_projection",
  "ar_expected_receipt_projection",
  "liquidity_source_feed",
  "fx_rate_snapshot",
  "forecast_variance",
  "internal_bank_account",
  "intercompany_transfer",

  // COMM
  "task",
  "task_checklist_item",
  "task_time_entry",
  "project",
  "project_member",
  "project_milestone",
  "project_phase",
  "comment",
  "label",
  "label_assignment",
  "saved_view",
  "subscription",
  "inbox_item",
  "notification_preference",
  "approval_request",
  "approval_step",
  "approval_policy",
  "approval_delegation",
  "announcement",
  "announcement_read",
  "board_meeting",
  "board_agenda_item",
  "board_meeting_attendee",
  "board_resolution",
  "board_resolution_vote",
  "board_minute",
  "board_action_item",
  "workflow",
  "workflow_run",
  "comm_document",
  "comm_document_collaborator",
] as const;

export type AuditEntityType = (typeof AuditEntityTypeValues)[number];
