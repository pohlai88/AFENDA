import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__vitest_test__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
