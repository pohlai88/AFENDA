import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__vitest_test__/**/*.test.ts", "src/**/__vitest_test__/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    passWithNoTests: true,
    testTimeout: 15_000,
    clearMocks: true,
    restoreMocks: true,
  },
});
