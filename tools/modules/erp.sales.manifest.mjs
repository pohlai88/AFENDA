/**
 * Module manifest: erp.sales
 *
 * Sales orders, quotes, commissions, pricing.
 */
export const moduleManifest = {
  code: "erp.sales",
  pillar: "erp",
  kind: "module",
  dependsOn: ["kernel", "erp.finance", "erp.crm"],
  owns: [
    "packages/contracts/src/erp/sales/**",
    "packages/db/src/schema/erp/sales.ts",
    "packages/core/src/erp/sales/**",
    "apps/api/src/routes/erp/sales.ts",
    "apps/worker/src/jobs/erp/sales/**",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
