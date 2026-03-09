/**
 * Module manifest: comm.notification
 *
 * In-app and push notification dispatch.
 */
export const moduleManifest = {
  code: "comm.notification",
  pillar: "comm",
  kind: "module",
  dependsOn: ["kernel"],
  owns: [
    "packages/contracts/src/comm/notification/**",
    "packages/db/src/schema/comm/notification.ts",
    "packages/core/src/comm/notification/**",
    "apps/api/src/routes/comm/notifications.ts",
    "apps/worker/src/jobs/comm/notification/**",
    "apps/web/src/app/(comm)/notifications/**",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
