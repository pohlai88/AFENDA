/**
 * Module manifest: erp.finance
 *
 * General ledger, accounts payable, accounts receivable, treasury,
 * tax, fiscal, FX, assets, lease, costing, consolidation, intercompany, reporting.
 */
export const moduleManifest = {
  code: "erp.finance",
  pillar: "erp",
  kind: "module",
  dependsOn: ["kernel", "erp.supplier"],
  owns: [
    "packages/contracts/src/erp/finance/**",
    "packages/db/src/schema/erp/finance/**",
    "packages/core/src/erp/finance/**",
    "apps/api/src/routes/erp/finance/**",
    "apps/worker/src/jobs/erp/finance/**",
    "apps/web/src/app/(erp)/finance/**",
  ],
  currentPaths: [],
};
