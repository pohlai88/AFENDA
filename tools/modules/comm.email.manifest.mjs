/**
 * Module manifest: comm.email
 *
 * Email sending, templates, tracking.
 */
export const moduleManifest = {
  code: "comm.email",
  pillar: "comm",
  kind: "module",
  dependsOn: ["kernel"],
  owns: [
    "packages/contracts/src/comm/email/**",
    "packages/db/src/schema/comm/email.ts",
    "packages/core/src/comm/email/**",
    "apps/worker/src/jobs/comm/email/**",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
