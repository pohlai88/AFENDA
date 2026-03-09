/**
 * Module manifest: erp.manufacturing
 *
 * Production orders, work centers, routing.
 */
export const moduleManifest = {
  code: "erp.manufacturing",
  pillar: "erp",
  kind: "module",
  dependsOn: ["kernel", "erp.inventory"],
  owns: [
    "packages/contracts/src/erp/manufacturing/**",
    "packages/db/src/schema/erp/manufacturing.ts",
    "packages/core/src/erp/manufacturing/**",
    "apps/api/src/routes/erp/manufacturing.ts",
    "apps/worker/src/jobs/erp/manufacturing/**",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
