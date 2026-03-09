/**
 * Module manifest: erp.inventory
 *
 * Warehouse, stock, movements, BOM.
 */
export const moduleManifest = {
  code: "erp.inventory",
  pillar: "erp",
  kind: "module",
  dependsOn: ["kernel", "erp.purchasing"],
  owns: [
    "packages/contracts/src/erp/inventory/**",
    "packages/db/src/schema/erp/inventory.ts",
    "packages/core/src/erp/inventory/**",
    "apps/api/src/routes/erp/inventory.ts",
    "apps/worker/src/jobs/erp/inventory/**",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
