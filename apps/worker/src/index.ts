import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

// OTel must bootstrap before any other imports that load http/pg
import { bootstrapTelemetry } from "@afenda/core";
await bootstrapTelemetry("afenda-worker");

import { run, type Logger as GraphileLogger } from "graphile-worker";
import { validateEnv, WorkerEnvSchema, resolveWorkerDbUrl, redactEnv, createLogger } from "@afenda/core";
import { processOutboxEvent } from "./jobs/process-outbox-event.js";
import { handleInvoiceSubmitted } from "./jobs/handle-invoice-submitted.js";
import { handleInvoiceApproved } from "./jobs/handle-invoice-approved.js";
import { handleJournalPosted } from "./jobs/handle-journal-posted.js";
import { handleJournalReversed } from "./jobs/handle-journal-reversed.js";
import { handleInvoiceRejected } from "./jobs/handle-invoice-rejected.js";
import { handleInvoiceVoided } from "./jobs/handle-invoice-voided.js";
import { handleInvoicePaid } from "./jobs/handle-invoice-paid.js";

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
  // Sprint 1 domain handlers:
  handle_invoice_submitted: handleInvoiceSubmitted,
  handle_invoice_approved: handleInvoiceApproved,
  handle_invoice_rejected: handleInvoiceRejected,
  handle_invoice_voided: handleInvoiceVoided,
  handle_invoice_paid: handleInvoicePaid,
  handle_journal_posted: handleJournalPosted,
  handle_journal_reversed: handleJournalReversed,
} as const;

const runner = await run({
  connectionString,
  concurrency: env.WORKER_CONCURRENCY,
  noHandleSignals: true, // We manage signals ourselves for clean coordinated shutdown
  taskList,
  logger: graphileLogger,
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

