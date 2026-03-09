/**
 * Module manifest: kernel.execution
 *
 * Outbox, idempotency, numbering.
 */
export const moduleManifest = {
  code: "kernel.execution",
  pillar: "kernel",
  kind: "module",
  dependsOn: [],
  owns: [
    "packages/contracts/src/kernel/execution/**",
    "packages/db/src/schema/kernel/execution_*.ts",
    "packages/core/src/kernel/execution/**",
    "apps/worker/src/jobs/kernel/process-outbox-event.ts",
    "apps/worker/src/jobs/kernel/retry-dead-letter.ts",
    "apps/worker/src/jobs/kernel/cleanup-idempotency.ts",
  ],
  currentPaths: [],
};
