import { defineConfig } from "vitest/config";
import path from "node:path";
import { buildCoverageConfig } from "../../tools/testing/vitest.shared";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/__vitest_test__/**/*.test.ts", "src/**/__vitest_test__/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    passWithNoTests: true,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    clearMocks: true,
    restoreMocks: true,
    coverage: buildCoverageConfig(["src/**/*.ts", "src/**/*.tsx"], ["src/**/index.ts", "**/__vitest_test__/**"]),
  },
});
