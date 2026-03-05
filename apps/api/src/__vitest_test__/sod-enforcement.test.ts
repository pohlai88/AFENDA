/**
 * Integration test: Separation of Duties enforcement.
 *
 * Sprint 1 Exit Criterion EC-2:
 *   "A user who submitted an invoice CANNOT approve it — returns 403."
 *
 * Exercises: SoD policy at the HTTP layer (approve-invoice command).
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, injectAs, resetDb, closeApp } from "./helpers/app-factory.js";
import {
  SUBMITTER_EMAIL,
  submitInvoicePayload,
  approveInvoicePayload,
  getTestSupplierId,
} from "./helpers/factories.js";

describe("separation of duties enforcement (EC-2)", () => {
  let app: FastifyInstance;
  let supplierId: string;

  beforeAll(async () => {
    app = await createTestApp();
    supplierId = await getTestSupplierId(app);
  });

  afterEach(async () => {
    if (app) await resetDb(app);
  });

  afterAll(async () => {
    if (app) await closeApp(app);
  });

  it("submitter cannot approve their own invoice — returns 403", async () => {
    // Submit as SUBMITTER
    const submitRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: submitInvoicePayload({ supplierId }),
    });
    expect(submitRes.statusCode).toBe(201);
    const invoiceId = submitRes.json().data.id;

    // Attempt to approve as the SAME submitter
    const approveRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/approve-invoice",
      payload: approveInvoicePayload(invoiceId),
    });

    expect(approveRes.statusCode).toBe(403);
    const body = approveRes.json();
    expect(body.error.code).toMatch(/FORBIDDEN|SOD|INSUFFICIENT_PERMISSIONS/i);
  });
});
