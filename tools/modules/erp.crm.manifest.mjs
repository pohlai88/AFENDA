/**
 * Module manifest: erp.crm
 *
 * Customers, leads, opportunities, contacts.
 */
export const moduleManifest = {
  code: "erp.crm",
  pillar: "erp",
  kind: "module",
  dependsOn: ["kernel"],
  owns: [
    "packages/contracts/src/erp/crm/**",
    "packages/db/src/schema/erp/crm.ts",
    "packages/core/src/erp/crm/**",
    "apps/api/src/routes/erp/crm.ts",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
