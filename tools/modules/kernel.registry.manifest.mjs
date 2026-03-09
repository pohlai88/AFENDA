/**
 * Module manifest: kernel.registry
 *
 * Entity definitions, field types, view layouts, actions, flows, overlays.
 * Absorbed from the old `meta/` directory.
 */
export const moduleManifest = {
  code: "kernel.registry",
  pillar: "kernel",
  kind: "module",
  dependsOn: [],
  owns: [
    "packages/contracts/src/kernel/registry/**",
    "packages/db/src/schema/kernel/registry.ts",
    "packages/core/src/kernel/registry/**",
    "apps/api/src/routes/kernel/registry.ts",
  ],
  currentPaths: [],
};
