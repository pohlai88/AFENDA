/**
 * Module manifest: comm.chatter
 *
 * Entity-attached discussion threads and activity log.
 */
export const moduleManifest = {
  code: "comm.chatter",
  pillar: "comm",
  kind: "module",
  dependsOn: ["kernel"],
  owns: [
    "packages/contracts/src/comm/chatter/**",
    "packages/db/src/schema/comm/chatter.ts",
    "packages/core/src/comm/chatter/**",
    "apps/api/src/routes/comm/chatter.ts",
    "apps/web/src/app/(comm)/chatter/**",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
