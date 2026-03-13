/**
 * Test app-factory — builds a Fastify instance against `afenda_test`.
 *
 * Provides:
 *   - `createTestApp()` — Fastify app backed by the test DB
 *   - `injectAs()` — shorthand for `app.inject()` with dev-auth header
 *   - `resetDb()` — truncates transactional tables between test suites
 *   - `closeApp()` — drains pool + closes server
 *
 * Test lifecycle:
 *   beforeAll  → createTestApp()
 *   afterEach  → resetDb(app)   (optional — only if test creates data)
 *   afterAll   → closeApp(app)
 */

import type { FastifyInstance, InjectOptions } from "fastify";

const TEST_DB_URL = "postgres://afenda:afenda@localhost:5433/afenda_test";

/**
 * Build the Fastify app with DATABASE_URL pointed at `afenda_test`.
 * Sets NODE_ENV=development so the dev-auth header path is active.
 *
 * Uses dynamic import to ensure env vars are set before module-level
 * `validateEnv()` runs in index.ts.
 */
export async function createTestApp(): Promise<FastifyInstance> {
  process.env["DATABASE_URL"] = TEST_DB_URL;
  process.env["NODE_ENV"] = "development";
  process.env["API_PORT"] = "19876";
  process.env["ALLOWED_ORIGINS"] = "";
  process.env["S3_ENDPOINT"] = process.env["S3_ENDPOINT"] ?? "http://localhost:9000";
  process.env["S3_REGION"] = process.env["S3_REGION"] ?? "auto";
  process.env["S3_BUCKET"] = process.env["S3_BUCKET"] ?? "afenda-test-bucket";
  process.env["S3_ACCESS_KEY_ID"] = process.env["S3_ACCESS_KEY_ID"] ?? "minio";
  process.env["S3_SECRET_ACCESS_KEY"] = process.env["S3_SECRET_ACCESS_KEY"] ?? "minio12345";
  process.env["AUTH_CHALLENGE_SECRET"] =
    process.env["AUTH_CHALLENGE_SECRET"] ??
    "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";

  // Dynamic import — env vars must be set before this line
  const { buildApp } = await import("../../index.js");
  const app = await buildApp();
  await app.ready();
  return app;
}

/**
 * Inject a request as a specific test user (via dev-auth header).
 * Returns the Fastify inject response.
 */
export async function injectAs(
  app: FastifyInstance,
  email: string,
  opts: Omit<InjectOptions, "headers"> & { headers?: Record<string, string> },
) {
  return app.inject({
    ...opts,
    headers: {
      "x-dev-user-email": email,
      "x-org-id": "test-org",
      ...opts.headers,
    },
  });
}

/**
 * Truncate all transactional tables (preserving reference data seeded in globalSetup).
 * Call in `afterEach` or `afterAll` when tests create invoices/journals.
 */
export async function resetDb(app: FastifyInstance) {
  // TRUNCATE in dependency order — children first
  await app.db.execute(/* sql */ `
    TRUNCATE
      comm_project_status_history,
      comm_project_phase,
      comm_project_milestone,
      comm_project_member,
      comm_project,
      forecast_variance,
      liquidity_forecast_bucket_lineage,
      liquidity_forecast_bucket,
      liquidity_forecast,
      liquidity_scenario,
      cash_position_snapshot_lineage,
      cash_position_snapshot_line,
      cash_position_snapshot,
      liquidity_source_feed,
      bank_statement_line,
      bank_statement,
      bank_account,
      journal_line,
      journal_entry,
      ap_hold,
      invoice_status_history,
      invoice,
      outbox_event,
      idempotency,
      audit_log,
      dead_letter_job
    CASCADE
  `);

  // Reset sequences back to 1 so tests get predictable numbers
  await app.db.execute(/* sql */ `
    UPDATE sequence SET next_value = 1
  `);
}

/**
 * Close the app — drains DB pool + stops Fastify.
 */
export async function closeApp(app: FastifyInstance) {
  await app.close();
}
