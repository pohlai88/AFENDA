/**
 * Module manifest: erp.project
 *
 * Project management, timesheets, resource planning.
 */
export const moduleManifest = {
  code: "erp.project",
  pillar: "erp",
  kind: "module",
  dependsOn: ["kernel", "erp.hr"],
  owns: [
    "packages/contracts/src/erp/project/**",
    "packages/db/src/schema/erp/project.ts",
    "packages/core/src/erp/project/**",
    "apps/api/src/routes/erp/project.ts",
  ],
  /** No current paths — future module */
  currentPaths: [],
};
