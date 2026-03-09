/**
 * Module manifest: comm.webhook
 *
 * Outbound webhook delivery and management.
 */
export const moduleManifest = {
  code: "comm.webhook",
  pillar: "comm",
  kind: "module",
  dependsOn: ["kernel"],
  owns: [
    "packages/contracts/src/comm/webhook/**",
    "packages/db/src/schema/comm/webhook.ts",
    "packages/core/src/comm/webhook/**",
    "apps/api/src/routes/comm/webhooks.ts",
    "apps/worker/src/jobs/comm/webhook/**",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
