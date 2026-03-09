/**
 * Module manifest: erp.purchasing
 *
 * Purchase orders, requisitions, receiving.
 */
export const moduleManifest = {
  code: "erp.purchasing",
  pillar: "erp",
  kind: "module",
  dependsOn: ["kernel", "erp.finance", "erp.supplier"],
  owns: [
    "packages/contracts/src/erp/purchasing/**",
    "packages/db/src/schema/erp/purchasing.ts",
    "packages/core/src/erp/purchasing/**",
    "apps/api/src/routes/erp/purchasing.ts",
    "apps/worker/src/jobs/erp/purchasing/**",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
