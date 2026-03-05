/**
 * Vitest workspace — each package/app runs its own vitest.config.ts.
 * The root `pnpm test` delegates to turbo which calls `vitest run` in each.
 * This file lets `vitest --workspace` discover all test projects at once.
 */
export default [
  "packages/core/vitest.config.ts",
  "packages/contracts/vitest.config.ts",
  "packages/db/vitest.config.ts",
  "packages/ui/vitest.config.ts",
  "apps/api/vitest.config.ts",
  "apps/worker/vitest.config.ts",
  "apps/web/vitest.config.ts",
];
