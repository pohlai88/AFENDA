/**
 * Module manifest: kernel.governance
 *
 * Audit, evidence, policy, settings.
 */
export const moduleManifest = {
  code: "kernel.governance",
  pillar: "kernel",
  kind: "module",
  dependsOn: [],
  owns: [
    "packages/contracts/src/kernel/governance/**",
    "packages/db/src/schema/kernel/governance_*.ts",
    "packages/core/src/kernel/governance/**",
    "apps/api/src/routes/kernel/audit.ts",
    "apps/api/src/routes/kernel/evidence.ts",
    "apps/api/src/routes/kernel/capabilities.ts",
  ],
  currentPaths: [],
};
