/**
 * Integration test: Audit log completeness.
 *
 * Sprint 1 Exit Criterion EC-5:
 *   "Every domain write (submit, approve, reject, post-to-gl) produces
 *    an audit_log row with the correct action, actor, and entity."
 *
 * Exercises: withAudit() integration via HTTP commands + direct DB query.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, injectAs, resetDb, closeApp } from "./helpers/app-factory.js";
import {
  SUBMITTER_EMAIL,
  APPROVER_EMAIL,
  submitInvoicePayload,
  approveInvoicePayload,
  rejectInvoicePayload,
  postToGLPayload,
  getTestSupplierId,
  getAccountIdByCode,
} from "./helpers/factories.js";

describe("audit log completeness (EC-5)", () => {
  let app: FastifyInstance;
  let supplierId: string;
  let debitAccountId: string;
  let creditAccountId: string;

  beforeAll(async () => {
    app = await createTestApp();
    supplierId = await getTestSupplierId(app);
    debitAccountId = await getAccountIdByCode(app, "5000");
    creditAccountId = await getAccountIdByCode(app, "2000");
  });

  afterEach(async () => {
    if (app) await resetDb(app);
  });

  afterAll(async () => {
    if (app) await closeApp(app);
  });

  it("submit + approve + post-to-gl each create an audit_log row", async () => {
    // Submit
    const submitRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: submitInvoicePayload({ supplierId }),
    });
    expect(submitRes.statusCode).toBe(201);
    const invoiceId = submitRes.json().data.id;

    // Approve
    const approveRes = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/approve-invoice",
      payload: approveInvoicePayload(invoiceId),
    });
    expect(approveRes.statusCode).toBe(200);

    // Post to GL
    const glRes = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/post-to-gl",
      payload: postToGLPayload({
        debitAccountId,
        creditAccountId,
        sourceInvoiceId: invoiceId,
      }),
    });
    expect(glRes.statusCode).toBe(201);

    // Query audit_log directly
    const result = await app.db.execute(
      /* sql */ `SELECT action, entity_type, entity_id FROM audit_log ORDER BY occurred_at ASC`,
    );
    const rows = (
      result as { rows: Array<{ action: string; entity_type: string; entity_id: string }> }
    ).rows;

    // Must have at least 3 audit rows for the 3 commands
    expect(rows.length).toBeGreaterThanOrEqual(3);

    const actions = rows.map((r) => r.action);
    expect(actions).toContain("invoice.submitted");
    expect(actions).toContain("invoice.approved");
    expect(actions).toContain("gl.journal.posted");

    // Verify entityId is populated for invoice audit rows
    const invoiceRows = rows.filter((r) => r.entity_type === "invoice");
    for (const row of invoiceRows) {
      expect(row.entity_id).toBe(invoiceId);
    }
  });

  it("reject-invoice creates an audit_log row", async () => {
    // Submit → reject
    const submitRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: submitInvoicePayload({ supplierId }),
    });
    const invoiceId = submitRes.json().data.id;

    const rejectRes = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/reject-invoice",
      payload: rejectInvoicePayload(invoiceId),
    });
    expect(rejectRes.statusCode).toBe(200);

    const result = await app.db.execute(
      /* sql */ `SELECT action FROM audit_log WHERE entity_id = '${invoiceId}' ORDER BY occurred_at ASC`,
    );
    const actions = (result as { rows: Array<{ action: string }> }).rows.map((r) => r.action);
    expect(actions).toContain("invoice.submitted");
    expect(actions).toContain("invoice.rejected");
  });
});
