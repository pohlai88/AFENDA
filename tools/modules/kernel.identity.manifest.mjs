/**
 * Module manifest: kernel.identity
 *
 * Authentication, organizations, principals, roles, permissions.
 */
export const moduleManifest = {
  code: "kernel.identity",
  pillar: "kernel",
  kind: "module",
  dependsOn: [],
  owns: [
    "packages/contracts/src/kernel/identity/**",
    "packages/db/src/schema/kernel/identity.ts",
    "packages/core/src/kernel/identity/**",
    "apps/api/src/routes/kernel/identity.ts",
  ],
  currentPaths: [],
};
