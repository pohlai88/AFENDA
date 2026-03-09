/**
 * Module manifest: erp.supplier
 *
 * Supplier master data, onboarding, compliance.
 */
export const moduleManifest = {
  code: "erp.supplier",
  pillar: "erp",
  kind: "module",
  dependsOn: ["kernel"],
  owns: [
    "packages/contracts/src/erp/supplier/**",
    "packages/db/src/schema/erp/supplier.ts",
    "packages/core/src/erp/supplier/**",
    "apps/api/src/routes/erp/supplier.ts",
  ],
  currentPaths: [],
};
