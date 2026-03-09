/**
 * Module manifest: comm.inbox
 *
 * Unified inbox for messages and activity streams.
 */
export const moduleManifest = {
  code: "comm.inbox",
  pillar: "comm",
  kind: "module",
  dependsOn: ["kernel"],
  owns: [
    "packages/contracts/src/comm/inbox/**",
    "packages/db/src/schema/comm/inbox.ts",
    "packages/core/src/comm/inbox/**",
    "apps/api/src/routes/comm/inbox.ts",
    "apps/web/src/app/(comm)/inbox/**",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
