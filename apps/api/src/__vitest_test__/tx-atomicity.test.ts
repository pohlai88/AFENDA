/**
 * Integration test: Transaction atomicity.
 *
 * Sprint 1 Exit Criterion EC-8:
 *   "If a GL posting fails mid-transaction (e.g. inactive account),
 *    neither the journal entry NOR the audit log row is persisted."
 *
 * Exercises: withAudit() rollback semantics at the HTTP layer.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, injectAs, resetDb, closeApp } from "./helpers/app-factory.js";
import { APPROVER_EMAIL, uniqueKey, getAccountIdByCode } from "./helpers/factories.js";

describe("transaction atomicity (EC-8)", () => {
  let app: FastifyInstance;
  let activeAccountId: string;

  beforeAll(async () => {
    app = await createTestApp();
    activeAccountId = await getAccountIdByCode(app, "5000");
  });

  afterEach(async () => {
    if (app) await resetDb(app);
  });

  afterAll(async () => {
    if (app) await closeApp(app);
  });

  it("failed GL post (non-existent account) leaves no journal entry or audit row", async () => {
    const fakeAccountId = "00000000-0000-0000-0000-000000000000";

    const res = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/post-to-gl",
      payload: {
        idempotencyKey: uniqueKey("atom"),
        correlationId: crypto.randomUUID(),
        memo: "Atomicity test",
        lines: [
          {
            accountId: activeAccountId,
            debitMinor: 100_00,
            currencyCode: "USD",
          },
          {
            accountId: fakeAccountId, // does not exist
            creditMinor: 100_00,
            currencyCode: "USD",
          },
        ],
      },
    });

    // Should fail — non-existent account
    expect(res.statusCode).toBeGreaterThanOrEqual(400);

    // Verify no journal entries were persisted
    const journalResult = await app.db.execute(
      /* sql */ `SELECT count(*) AS cnt FROM journal_entry`,
    );
    const journalCount = Number(
      (journalResult as unknown as { rows: Array<{ cnt: string }> }).rows[0]?.cnt ?? 0,
    );
    expect(journalCount).toBe(0);

    // Verify no audit rows were persisted for this failed operation
    const auditResult = await app.db.execute(
      /* sql */ `SELECT count(*) AS cnt FROM audit_log WHERE action = 'gl.journal.posted'`,
    );
    const auditCount = Number((auditResult as unknown as { rows: Array<{ cnt: string }> }).rows[0]?.cnt ?? 0);
    expect(auditCount).toBe(0);
  });

  it("failed invoice approval (non-existent invoice) leaves no audit row", async () => {
    const fakeInvoiceId = "00000000-0000-0000-0000-000000000000";

    const res = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/approve-invoice",
      payload: {
        idempotencyKey: uniqueKey("atom-inv"),
        invoiceId: fakeInvoiceId,
      },
    });

    expect(res.statusCode).toBe(404);

    // No audit row should exist
    const auditResult = await app.db.execute(
      /* sql */ `SELECT count(*) AS cnt FROM audit_log WHERE action = 'invoice.approved'`,
    );
    const auditCount = Number((auditResult as unknown as { rows: Array<{ cnt: string }> }).rows[0]?.cnt ?? 0);
    expect(auditCount).toBe(0);
  });
});
