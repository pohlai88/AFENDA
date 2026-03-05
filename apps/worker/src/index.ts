import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

import { run } from "graphile-worker";
import { validateEnv, WorkerEnvSchema, resolveWorkerDbUrl, redactEnv } from "@afenda/core";
import { processOutboxEvent } from "./jobs/process-outbox-event.js";

// ── Validate environment ─────────────────────────────────────────────────────
const env = validateEnv(WorkerEnvSchema);

const connectionString = resolveWorkerDbUrl(env);

console.log("🔧 worker starting...");
console.log("   config:", JSON.stringify(redactEnv(env), null, 2));
console.log(`   concurrency: ${env.WORKER_CONCURRENCY}`);
console.log(`   poll interval: ${env.WORKER_POLL_INTERVAL_MS}ms`);
console.log(`   max retries: ${env.WORKER_MAX_RETRIES}`);

const runner = await run({
  connectionString,
  concurrency: env.WORKER_CONCURRENCY,
  pollInterval: env.WORKER_POLL_INTERVAL_MS,
  taskList: {
    process_outbox_event: processOutboxEvent,
  },
});

console.log("✅ worker running and polling");

// ── Heartbeat ─────────────────────────────────────────────────────────────────
// Emits a log line every 30 s so container orchestrators and log aggregators
// can detect a silent (deadlocked) worker.
const heartbeatInterval = setInterval(() => {
  console.log(`[heartbeat] ${new Date().toISOString()} — worker alive`);
}, 30_000);

process.on("SIGTERM", async () => {
  clearInterval(heartbeatInterval);
  console.log("worker shutting down...");
  await runner.stop();
  process.exit(0);
});

await runner.promise;
