import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    passWithNoTests: true,
    testTimeout: 10_000,
    clearMocks: true,
    restoreMocks: true,
  },
});
