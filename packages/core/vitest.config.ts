import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__vitest_test__/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/index.ts", "**/*.test.ts", "**/__vitest_test__/**"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
