import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const E2E_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${E2E_PORT}`;

/**
 * Playwright E2E configuration for the AFENDA web app.
 *
 * Run with:
 *   pnpm -C apps/web e2e            (from root)
 *   pnpm e2e                        (root shortcut)
 *   npx playwright test             (from apps/web)
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],
  timeout: 30_000,

  expect: {
    timeout: 5_000,
  },

  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    // Consistent viewport across runs
    viewport: { width: 1280, height: 720 },
    // Accessibility: force color scheme for contrast testing
    colorScheme: "light",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Mobile viewport for responsive testing
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  /* Start the dev server before running tests (local dev only).
   * Auth tests need web + API. dev:e2e skips worker to avoid startup failures. */
  webServer: process.env.CI || process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // Use a dedicated port to avoid attaching tests to an unrelated server on :3000.
        command: `pnpm -C apps/web exec next dev --webpack --port ${E2E_PORT}`,
        url: E2E_BASE_URL,
        cwd: "../..",
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
