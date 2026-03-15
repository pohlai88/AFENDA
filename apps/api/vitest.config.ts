import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const fromRoot = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@afenda/contracts": fromRoot("../../packages/contracts/src/index.ts"),
      "@afenda/core": fromRoot("../../packages/core/src/index.ts"),
      "@afenda/db": fromRoot("../../packages/db/src/index.ts"),
    },
  },
  test: {
    include: ["src/**/__vitest_test__/**/*.test.ts", "src/**/__vitest_test__/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    passWithNoTests: true,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    clearMocks: true,
    restoreMocks: true,
    pool: "forks",
    globalSetup: ["src/__vitest_test__/global-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/index.ts", "src/types.ts", "**/__vitest_test__/**"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
