import { defineConfig, devices } from "@playwright/test";

const IS_CI = !!process.env.CI;
const E2E_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const E2E_HOST = process.env.PLAYWRIGHT_HOST ?? "localhost";
const E2E_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${E2E_HOST}:${E2E_PORT}`;
const HAS_EXTERNAL_BASE_URL = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const RUN_CROSS_BROWSER = process.env.PLAYWRIGHT_CROSS_BROWSER === "1";
const ENV_WORKERS = process.env.PLAYWRIGHT_WORKERS;

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
  fullyParallel: false,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  // Playwright recommends serial CI workers for stability. Keep local parallel unless explicitly overridden.
  workers: ENV_WORKERS ? Number(ENV_WORKERS) : IS_CI ? 1 : undefined,
  reporter: IS_CI
    ? [["github"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/e2e-junit-results.xml" }]]
    : [["line"], ["html", { open: "on-failure" }]],
  timeout: 120_000,

  expect: {
    timeout: 5_000,
  },

  use: {
    baseURL: E2E_BASE_URL,
    // Collect trace on retries to keep CI overhead lower while preserving debuggability.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Consistent viewport across runs
    viewport: { width: 1280, height: 720 },
    // Accessibility: force color scheme for contrast testing
    colorScheme: "light",
  },

  projects: RUN_CROSS_BROWSER
    ? [
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
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
      ],

  /* Start the dev server before running tests (local dev only).
   * Auth tests need web + API. dev:e2e skips worker to avoid startup failures. */
  webServer:
    HAS_EXTERNAL_BASE_URL
      ? undefined
      : {
          // Use node+next directly to avoid Windows `Terminate batch job (Y/N)?` prompts from pnpm.cmd.
          command: `node ./node_modules/next/dist/bin/next dev --webpack --port ${E2E_PORT}`,
          url: E2E_BASE_URL,
          cwd: ".",
          // Reuse local server for faster iteration; require a fresh process in CI.
          reuseExistingServer: !IS_CI,
          timeout: 180_000,
        },
});
