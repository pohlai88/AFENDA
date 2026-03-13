import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

// OTel must bootstrap before any other imports that load http/pg
import { bootstrapTelemetry } from "@afenda/core";
await bootstrapTelemetry("afenda-worker");

import { run, type Logger as GraphileLogger } from "graphile-worker";
import {
  validateEnv,
  WorkerEnvSchema,
  resolveWorkerDbUrl,
  redactEnv,
  createLogger,
} from "@afenda/core";
import { processOutboxEvent } from "./jobs/kernel/process-outbox-event.js";
import { processAuthAuditOutbox } from "./jobs/kernel/process-auth-audit-outbox.js";
import { handleInvoiceSubmitted } from "./jobs/erp/finance/ap/handle-invoice-submitted.js";
import { handleInvoiceApproved } from "./jobs/erp/finance/ap/handle-invoice-approved.js";
import { handleJournalPosted } from "./jobs/erp/finance/gl/handle-journal-posted.js";
import { handleJournalReversed } from "./jobs/erp/finance/gl/handle-journal-reversed.js";
import { handleInvoiceRejected } from "./jobs/erp/finance/ap/handle-invoice-rejected.js";
import { handleInvoiceVoided } from "./jobs/erp/finance/ap/handle-invoice-voided.js";
import { handleInvoicePaid } from "./jobs/erp/finance/ap/handle-invoice-paid.js";
import { handleHoldEvent } from "./jobs/erp/finance/ap/handle-hold.js";
import { handleInvoiceLineEvent } from "./jobs/erp/finance/ap/handle-invoice-line.js";
import { handleMatchToleranceEvent } from "./jobs/erp/finance/ap/handle-match-tolerance.js";
import { handlePaymentRunEvent } from "./jobs/erp/finance/ap/handle-payment-run.js";
import { handlePaymentRunItemEvent } from "./jobs/erp/finance/ap/handle-payment-run-item.js";
import { handlePaymentTermsEvent } from "./jobs/erp/finance/ap/handle-payment-terms.js";
import { handlePrepaymentEvent } from "./jobs/erp/finance/ap/handle-prepayment.js";
import { handleWhtCertificateEvent } from "./jobs/erp/finance/ap/handle-wht-certificate.js";
import { handleTreasuryBankAccountEvent } from "./jobs/erp/finance/treasury/handle-bank-account.js";
import { handleTreasuryBankStatementEvent } from "./jobs/erp/finance/treasury/handle-bank-statement.js";
import { handleTreasuryReconciliationEvent } from "./jobs/erp/finance/treasury/handle-reconciliation.js";
import { handleTreasuryPaymentEvent } from "./jobs/erp/finance/treasury/handle-payment.js";
import { handleTreasuryCashPositionEvent } from "./jobs/erp/finance/treasury/handle-cash-position.js";
import { handleTreasuryLiquidityForecastEvent } from "./jobs/erp/finance/treasury/handle-liquidity-forecast.js";
import { handleTreasuryForecastVarianceEvent } from "./jobs/erp/finance/treasury/handle-forecast-variance.js";
import { handleTreasuryLiquiditySourceFeedEvent } from "./jobs/erp/finance/treasury/handle-liquidity-source-feed.js";
import { handleTreasuryFxRateSnapshotEvent } from "./jobs/erp/finance/treasury/handle-fx-rate-snapshot.js";
import { handleTreasuryApDuePaymentProjectionEvent } from "./jobs/erp/finance/treasury/handle-ap-due-payment-projection.js";
import { handleTreasuryArExpectedReceiptProjectionEvent } from "./jobs/erp/finance/treasury/handle-ar-expected-receipt-projection.js";
<<<<<<< HEAD
import { handleTreasuryInternalBankAccountEvent } from "./jobs/erp/finance/treasury/handle-internal-bank-account.js";
import { handleTreasuryIntercompanyTransferEvent } from "./jobs/erp/finance/treasury/handle-intercompany-transfer.js";
import { handleIntercompanyTransferSettled } from "./jobs/erp/finance/treasury/handle-intercompany-transfer-settled.js";
import { handleTreasuryNettingSessionClosedEvent } from "./jobs/erp/finance/treasury/handle-netting-session-closed.js";
import { handleTreasuryInternalInterestRateEvent } from "./jobs/erp/finance/treasury/handle-internal-interest-rate.js";
import { handleTreasuryFxRiskEvent } from "./jobs/erp/finance/treasury/handle-fx-risk.js";
import { handleTreasuryRevaluationEvent } from "./jobs/erp/finance/treasury/handle-revaluation.js";
import { handleTreasuryLimitBreached } from "./jobs/erp/finance/treasury/handle-treasury-limit-breached.js";
import { handleBankConnectorSyncRequested } from "./jobs/erp/finance/treasury/handle-bank-connector-sync-requested.js";
import { handleMarketDataRefreshRequested } from "./jobs/erp/finance/treasury/handle-market-data-refresh-requested.js";
import { handleTreasuryPostingRequested } from "./jobs/erp/finance/treasury/handle-treasury-posting-requested.js";
=======
import { handleTaskCreated } from "./jobs/comm/tasks/handle-task-created.js";
import { handleTaskUpdated } from "./jobs/comm/tasks/handle-task-updated.js";
import { handleTaskAssigned } from "./jobs/comm/tasks/handle-task-assigned.js";
import { handleTasksBulkAssigned } from "./jobs/comm/tasks/handle-tasks-bulk-assigned.js";
import { handleTaskStatusChanged } from "./jobs/comm/tasks/handle-task-status-changed.js";
import { handleTasksBulkTransitioned } from "./jobs/comm/tasks/handle-tasks-bulk-status-changed.js";
import { handleTaskCompleted } from "./jobs/comm/tasks/handle-task-completed.js";
import { handleTaskArchived } from "./jobs/comm/tasks/handle-task-archived.js";
import { handleTaskChecklistAdded } from "./jobs/comm/tasks/handle-task-checklist-added.js";
import { handleTaskChecklistToggled } from "./jobs/comm/tasks/handle-task-checklist-toggled.js";
import { handleTaskChecklistRemoved } from "./jobs/comm/tasks/handle-task-checklist-removed.js";
import { handleTaskTimeLogged } from "./jobs/comm/tasks/handle-task-time-logged.js";
import { handleProjectCreated } from "./jobs/comm/projects/handle-project-created.js";
import { handleProjectUpdated } from "./jobs/comm/projects/handle-project-updated.js";
import { handleProjectStatusChanged } from "./jobs/comm/projects/handle-project-status-changed.js";
import { handleProjectMemberAdded } from "./jobs/comm/projects/handle-project-member-added.js";
import { handleProjectMemberRemoved } from "./jobs/comm/projects/handle-project-member-removed.js";
import { handleProjectMilestoneCreated } from "./jobs/comm/projects/handle-project-milestone-created.js";
import { handleProjectMilestoneCompleted } from "./jobs/comm/projects/handle-project-milestone-completed.js";
import { handleApprovalRequested } from "./jobs/comm/approvals/handle-approval-requested.js";
import { handleApprovalStepApproved } from "./jobs/comm/approvals/handle-approval-step-approved.js";
import { handleApprovalApproved } from "./jobs/comm/approvals/handle-approval-approved.js";
import { handleApprovalStepRejected } from "./jobs/comm/approvals/handle-approval-step-rejected.js";
import { handleApprovalStepDelegated } from "./jobs/comm/approvals/handle-approval-step-delegated.js";
import { handleApprovalEscalated } from "./jobs/comm/approvals/handle-approval-escalated.js";
import { handleApprovalWithdrawn } from "./jobs/comm/approvals/handle-approval-withdrawn.js";
import { handleAnnouncementPublished } from "./jobs/comm/announcements/handle-announcement-published.js";
import { handleAnnouncementScheduled } from "./jobs/comm/announcements/handle-announcement-scheduled.js";
import { handleAnnouncementAcknowledged } from "./jobs/comm/announcements/handle-announcement-acknowledged.js";
import { handleAnnouncementArchived } from "./jobs/comm/announcements/handle-announcement-archived.js";
import { handleCommentCreated } from "./jobs/comm/shared/handle-comment-created.js";
import { handleLabelCreated } from "./jobs/comm/shared/handle-label-created.js";
import { handleLabelUpdated } from "./jobs/comm/shared/handle-label-updated.js";
import { handleLabelDeleted } from "./jobs/comm/shared/handle-label-deleted.js";
import { handleLabelAssigned } from "./jobs/comm/shared/handle-label-assigned.js";
import { handleLabelUnassigned } from "./jobs/comm/shared/handle-label-unassigned.js";
import { handleSavedViewCreated } from "./jobs/comm/shared/handle-saved-view-created.js";
import { handleSavedViewUpdated } from "./jobs/comm/shared/handle-saved-view-updated.js";
import { handleSavedViewDeleted } from "./jobs/comm/shared/handle-saved-view-deleted.js";
import { handleSubscriptionCreated } from "./jobs/comm/shared/handle-subscription-created.js";
import { handleSubscriptionDeleted } from "./jobs/comm/shared/handle-subscription-deleted.js";
import { handleCommentMentionsCreated } from "./jobs/comm/shared/handle-comment-mentions-created.js";
import { handleInboxItemRead } from "./jobs/comm/shared/handle-inbox-item-read.js";
import { handleInboxAllRead } from "./jobs/comm/shared/handle-inbox-all-read.js";
import { handleNotificationPreferenceUpdated } from "./jobs/comm/shared/handle-notification-preference-updated.js";
>>>>>>> d80f778 (feat(comm): implement communication domain slices and worker handlers)

// ── Validate environment ─────────────────────────────────────────────────────
const env = validateEnv(WorkerEnvSchema);
const log = createLogger("worker");

const connectionString = resolveWorkerDbUrl(env);

// ── Pino → Graphile logger adapter ───────────────────────────────────────────
// Graphile Worker's built-in logger uses a different interface.
// Bridge it to Pino so all structured logs land in the same pipeline.
const graphileLogger: GraphileLogger = {
  error(message: string, meta?: Record<string, unknown>) {
    log.error(meta ?? {}, message);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    log.warn(meta ?? {}, message);
  },
  info(message: string, meta?: Record<string, unknown>) {
    log.info(meta ?? {}, message);
  },
  debug(message: string, meta?: Record<string, unknown>) {
    log.debug(meta ?? {}, message);
  },
  scope() {
    return graphileLogger;
  },
} as unknown as GraphileLogger;

log.info("worker starting...");
log.info({ config: redactEnv(env) }, "worker config (redacted)");
log.info({ concurrency: env.WORKER_CONCURRENCY }, "concurrency");

// ── Task registry ────────────────────────────────────────────────────────────
// Each task maps to a string identifier that Graphile Worker uses as the
// `task_identifier` column in graphile_worker._private_jobs.
// Add new tasks here as Sprint 1+ domain handlers are implemented.
const taskList = {
  process_outbox_event: processOutboxEvent,
  process_auth_audit_outbox: processAuthAuditOutbox,
  // Sprint 1 domain handlers:
  handle_invoice_submitted: handleInvoiceSubmitted,
  handle_invoice_approved: handleInvoiceApproved,
  handle_invoice_rejected: handleInvoiceRejected,
  handle_invoice_voided: handleInvoiceVoided,
  handle_invoice_paid: handleInvoicePaid,
  handle_hold_event: handleHoldEvent,
  handle_invoice_line_event: handleInvoiceLineEvent,
  handle_match_tolerance_event: handleMatchToleranceEvent,
  handle_payment_run_event: handlePaymentRunEvent,
  handle_payment_run_item_event: handlePaymentRunItemEvent,
  handle_payment_terms_event: handlePaymentTermsEvent,
  handle_prepayment_event: handlePrepaymentEvent,
  handle_wht_certificate_event: handleWhtCertificateEvent,
  handle_treasury_bank_account_event: handleTreasuryBankAccountEvent,
  handle_treasury_bank_statement_event: handleTreasuryBankStatementEvent,
  handle_treasury_reconciliation_event: handleTreasuryReconciliationEvent,
  handle_treasury_payment_event: handleTreasuryPaymentEvent,
  handle_treasury_cash_position_event: handleTreasuryCashPositionEvent,
  handle_treasury_liquidity_forecast_event: handleTreasuryLiquidityForecastEvent,
  handle_treasury_forecast_variance_event: handleTreasuryForecastVarianceEvent,
  handle_treasury_liquidity_source_feed_event: handleTreasuryLiquiditySourceFeedEvent,
  handle_treasury_fx_rate_snapshot_event: handleTreasuryFxRateSnapshotEvent,
  // Wave 3.5 — AP/AR → Treasury Bridge
  handle_treasury_ap_due_payment_projection_event: handleTreasuryApDuePaymentProjectionEvent,
  handle_treasury_ar_expected_receipt_projection_event:
    handleTreasuryArExpectedReceiptProjectionEvent,
<<<<<<< HEAD
  // Wave 4.1 — In-house Banking + Intercompany Transfers
  handle_treasury_internal_bank_account_event: handleTreasuryInternalBankAccountEvent,
  handle_treasury_intercompany_transfer_event: handleTreasuryIntercompanyTransferEvent,
  handle_treasury_intercompany_transfer_settled_event: handleIntercompanyTransferSettled,
  handle_treasury_netting_session_closed_event: handleTreasuryNettingSessionClosedEvent,
  handle_treasury_internal_interest_rate_event: handleTreasuryInternalInterestRateEvent,
  // Wave 5.1 — FX Management + Revaluation
  handle_treasury_fx_risk_event: handleTreasuryFxRiskEvent,
  handle_treasury_revaluation_event: handleTreasuryRevaluationEvent,
  // Wave 6.1 — Treasury Policy + Limits
  handle_treasury_limit_breached_event: handleTreasuryLimitBreached,
  // Wave 6.2 — Integrations + Market Data
  handle_bank_connector_sync_requested: handleBankConnectorSyncRequested,
  handle_market_data_refresh_requested: handleMarketDataRefreshRequested,
  // Wave 5.2 — Treasury Accounting Bridge
  handle_treasury_posting_requested: handleTreasuryPostingRequested,
=======
>>>>>>> d80f778 (feat(comm): implement communication domain slices and worker handlers)
  handle_journal_posted: handleJournalPosted,
  handle_journal_reversed: handleJournalReversed,
  handle_task_created: handleTaskCreated,
  handle_task_updated: handleTaskUpdated,
  handle_task_assigned: handleTaskAssigned,
  handle_tasks_bulk_assigned: handleTasksBulkAssigned,
  handle_task_status_changed: handleTaskStatusChanged,
  handle_tasks_bulk_transitioned: handleTasksBulkTransitioned,
  handle_task_completed: handleTaskCompleted,
  handle_task_archived: handleTaskArchived,
  handle_task_checklist_added: handleTaskChecklistAdded,
  handle_task_checklist_toggled: handleTaskChecklistToggled,
  handle_task_checklist_removed: handleTaskChecklistRemoved,
  handle_task_time_logged: handleTaskTimeLogged,
  handle_project_created: handleProjectCreated,
  handle_project_updated: handleProjectUpdated,
  handle_project_status_changed: handleProjectStatusChanged,
  handle_project_member_added: handleProjectMemberAdded,
  handle_project_member_removed: handleProjectMemberRemoved,
  handle_project_milestone_created: handleProjectMilestoneCreated,
  handle_project_milestone_completed: handleProjectMilestoneCompleted,
  handle_approval_requested: handleApprovalRequested,
  handle_approval_step_approved: handleApprovalStepApproved,
  handle_approval_approved: handleApprovalApproved,
  handle_approval_step_rejected: handleApprovalStepRejected,
  handle_approval_step_delegated: handleApprovalStepDelegated,
  handle_approval_escalated: handleApprovalEscalated,
  handle_approval_withdrawn: handleApprovalWithdrawn,
  handle_announcement_published: handleAnnouncementPublished,
  handle_announcement_scheduled: handleAnnouncementScheduled,
  handle_announcement_acknowledged: handleAnnouncementAcknowledged,
  handle_announcement_archived: handleAnnouncementArchived,
  handle_comment_created: handleCommentCreated,
  handle_label_created: handleLabelCreated,
  handle_label_updated: handleLabelUpdated,
  handle_label_deleted: handleLabelDeleted,
  handle_label_assigned: handleLabelAssigned,
  handle_label_unassigned: handleLabelUnassigned,
  handle_saved_view_created: handleSavedViewCreated,
  handle_saved_view_updated: handleSavedViewUpdated,
  handle_saved_view_deleted: handleSavedViewDeleted,
  handle_subscription_created: handleSubscriptionCreated,
  handle_subscription_deleted: handleSubscriptionDeleted,
  handle_comment_mentions_created: handleCommentMentionsCreated,
  handle_inbox_item_read: handleInboxItemRead,
  handle_inbox_all_read: handleInboxAllRead,
  handle_notification_preference_updated: handleNotificationPreferenceUpdated,
} as const;

const runner = await run({
  connectionString,
  concurrency: env.WORKER_CONCURRENCY,
  noHandleSignals: true, // We manage signals ourselves for clean coordinated shutdown
  taskList,
  logger: graphileLogger,
  // Drain the auth audit outbox every minute.
  // jobKey ensures only one instance is queued at a time if the previous run is slow.
  crontab: `* * * * * process_auth_audit_outbox ?jobKey=auth_audit_drain&jobKeyMode=replace`,
});

log.info(
  { tasks: Object.keys(taskList) },
  "worker running (LISTEN/NOTIFY mode, %d tasks registered)",
  Object.keys(taskList).length,
);

// ── Heartbeat ─────────────────────────────────────────────────────────────────
// Emits a log line every 30 s so container orchestrators and log aggregators
// can detect a silent (deadlocked) worker.
const heartbeatInterval = setInterval(() => {
  log.debug("heartbeat — worker alive");
}, 30_000);

// ── Graceful shutdown ────────────────────────────────────────────────────────
// Handle both SIGTERM (container orchestrators) and SIGINT (Ctrl+C in dev).
// runner.stop() waits for in-flight jobs to finish, then resolves runner.promise.
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return; // guard against double-signal
  shuttingDown = true;
  clearInterval(heartbeatInterval);
  log.info({ signal }, "worker shutting down…");
  await runner.stop();
  // runner.promise resolves after stop() — process exits naturally below
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

await runner.promise;
log.info("worker exited cleanly");
