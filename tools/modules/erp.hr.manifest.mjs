/**
 * Module manifest: erp.hr
 *
 * Employees, payroll, benefits, leave.
 */
export const moduleManifest = {
  code: "erp.hr",
  pillar: "erp",
  kind: "module",
  dependsOn: ["kernel", "erp.finance"],
  owns: [
    "packages/contracts/src/erp/hr/**",
    "packages/db/src/schema/erp/hr.ts",
    "packages/core/src/erp/hr/**",
    "apps/api/src/routes/erp/hr.ts",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
