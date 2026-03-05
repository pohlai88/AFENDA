/**
 * Integration test: Mark Paid command.
 *
 * Sprint 2 Exit Criterion:
 *   "A posted invoice can be marked as paid via the mark-paid command.
 *    Status transitions to 'paid', status history records the transition,
 *    and double-pay returns 409."
 *
 * Lifecycle: submit → approve → post-to-GL → mark-paid.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, injectAs, resetDb, closeApp } from "./helpers/app-factory.js";
import {
  SUBMITTER_EMAIL,
  APPROVER_EMAIL,
  submitInvoicePayload,
  approveInvoicePayload,
  postToGLPayload,
  markPaidPayload,
  getTestSupplierId,
  getAccountIdByCode,
} from "./helpers/factories.js";

describe("mark-paid command", () => {
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

  /**
   * Helper: drive an invoice through submit → approve → post-to-GL → "posted" status.
   * Returns the invoiceId after the GL post.
   */
  async function driveToPosted(): Promise<string> {
    // Submit
    const submitRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: submitInvoicePayload({ supplierId, amountMinor: 250_00 }),
    });
    expect(submitRes.statusCode).toBe(201);
    const invoiceId = submitRes.json().data.id;

    // Approve (different user — SoD)
    const approveRes = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/approve-invoice",
      payload: approveInvoicePayload(invoiceId),
    });
    expect(approveRes.statusCode).toBe(200);

    // Post to GL (transitions invoice to "posted" via the approved→posted path)
    const glRes = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/post-to-gl",
      payload: postToGLPayload({
        debitAccountId,
        creditAccountId,
        amountMinor: 250_00,
        sourceInvoiceId: invoiceId,
      }),
    });
    expect(glRes.statusCode).toBe(201);

    // Manually transition to "posted" via raw SQL (worker normally does this,
    // but we don't run the worker in integration tests).
    await app.db.execute(
      /* sql */ `UPDATE invoice SET status = 'posted', updated_at = now() WHERE id = '${invoiceId}'`,
    );
    await app.db
      .execute(/* sql */ `INSERT INTO invoice_status_history (invoice_id, org_id, from_status, to_status, actor_principal_id, correlation_id)
       SELECT i.id, i.org_id, 'approved', 'posted', NULL, gen_random_uuid()::text
       FROM invoice i WHERE i.id = '${invoiceId}'`);

    return invoiceId;
  }

  it("marks a posted invoice as paid — returns 200 with invoice id", async () => {
    const invoiceId = await driveToPosted();

    const res = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/mark-paid",
      payload: markPaidPayload(invoiceId, "BANK-TXN-12345"),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.id).toBe(invoiceId);

    // Verify status is now "paid"
    const getRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/invoices/${invoiceId}`,
    });
    expect(getRes.statusCode).toBe(200);
    const inv = getRes.json().data;
    expect(inv.status).toBe("paid");
    expect(inv.paymentReference).toBe("BANK-TXN-12345");
    expect(inv.paidAt).toBeTruthy();
    expect(inv.paidByPrincipalId).toBeTruthy();
  });

  it("double-pay returns 409 AP_INVOICE_ALREADY_PAID", async () => {
    const invoiceId = await driveToPosted();

    // First pay
    const res1 = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/mark-paid",
      payload: markPaidPayload(invoiceId, "PAY-001"),
    });
    expect(res1.statusCode).toBe(200);

    // Second pay → 409
    const res2 = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/mark-paid",
      payload: markPaidPayload(invoiceId, "PAY-002"),
    });
    expect(res2.statusCode).toBe(409);
    expect(res2.json().error.code).toBe("AP_INVOICE_ALREADY_PAID");
  });

  it("cannot mark draft invoice as paid — returns 409", async () => {
    // Submit only (status=submitted, not posted)
    const submitRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: submitInvoicePayload({ supplierId }),
    });
    expect(submitRes.statusCode).toBe(201);
    const invoiceId = submitRes.json().data.id;

    const res = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/mark-paid",
      payload: markPaidPayload(invoiceId),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("AP_INVOICE_INVALID_STATUS_TRANSITION");
  });

  it("mark-paid without permission returns 403", async () => {
    const invoiceId = await driveToPosted();

    // SUBMITTER_EMAIL has the "operator" role — no ap.invoice.markpaid permission
    const res = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/mark-paid",
      payload: markPaidPayload(invoiceId),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("IAM_INSUFFICIENT_PERMISSIONS");
  });

  it("mark-paid records status history row", async () => {
    const invoiceId = await driveToPosted();

    await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/mark-paid",
      payload: markPaidPayload(invoiceId, "PAY-HIST-001"),
    });

    const historyRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/invoices/${invoiceId}/history`,
    });
    expect(historyRes.statusCode).toBe(200);
    const history = historyRes.json().data;

    // Find the posted→paid transition
    const paidTransition = history.find((h: { toStatus: string }) => h.toStatus === "paid");
    expect(paidTransition).toBeDefined();
    expect(paidTransition.fromStatus).toBe("posted");
  });
});
