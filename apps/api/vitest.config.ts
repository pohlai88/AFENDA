import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
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
      exclude: ["src/**/index.ts", "src/types.ts", "**/*.test.ts"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
