import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    passWithNoTests: true,
    testTimeout: 10_000,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/index.ts", "**/*.test.ts", "**/*.test.tsx"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
