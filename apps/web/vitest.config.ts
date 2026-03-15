import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__vitest_test__/**/*.test.ts", "src/**/__vitest_test__/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    passWithNoTests: true,
    testTimeout: 10_000,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/index.ts", "**/__vitest_test__/**"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
