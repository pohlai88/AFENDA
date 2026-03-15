import { defineConfig } from "vitest/config";
import { buildCoverageConfig } from "../../tools/testing/vitest.shared";

export default defineConfig({
  test: {
    include: ["src/**/__vitest_test__/**/*.test.ts", "src/**/__vitest_test__/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    passWithNoTests: true,
    testTimeout: 15_000,
    hookTimeout: 15_000,
    clearMocks: true,
    restoreMocks: true,
    coverage: buildCoverageConfig(["src/**/*.ts"], ["src/**/index.ts", "**/__vitest_test__/**"]),
  },
});
