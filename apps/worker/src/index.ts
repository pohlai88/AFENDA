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
  handle_journal_posted: handleJournalPosted,
  handle_journal_reversed: handleJournalReversed,
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
