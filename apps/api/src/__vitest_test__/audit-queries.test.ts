/**
 * Integration test: Audit log query endpoints.
 *
 * Sprint 2 Exit Criterion:
 *   "Audit logs can be listed with cursor-pagination and filtered by
 *    entityType, entityId, action. Entity audit trail endpoint returns
 *    the full audit trail for a specific entity."
 *
 * Exercises: POST submit-invoice (generates audit), GET audit-logs, GET audit-trail.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  createTestApp,
  injectAs,
  resetDb,
  closeApp,
} from "./helpers/app-factory.js";
import {
  SUBMITTER_EMAIL,
  APPROVER_EMAIL,
  submitInvoicePayload,
  approveInvoicePayload,
  getTestSupplierId,
} from "./helpers/factories.js";

describe("audit log query endpoints", () => {
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

  it("GET /v1/audit-logs returns paginated audit log entries", async () => {
    // Generate audit data by submitting an invoice
    const submitRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: submitInvoicePayload({ supplierId }),
    });
    expect(submitRes.statusCode).toBe(201);

    // Query audit logs
    const auditRes = await injectAs(app, APPROVER_EMAIL, {
      method: "GET",
      url: "/v1/audit-logs",
    });

    expect(auditRes.statusCode).toBe(200);
    const body = auditRes.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.hasMore).toBeDefined();
    expect(body.correlationId).toBeDefined();

    // Verify structure of an audit entry
    const entry = body.data[0];
    expect(entry.id).toBeDefined();
    expect(entry.orgId).toBeDefined();
    expect(entry.action).toBeDefined();
    expect(entry.entityType).toBeDefined();
    expect(entry.occurredAt).toBeDefined();
  });

  it("filters audit logs by entityType=invoice", async () => {
    // Submit two invoices to generate invoice audit events
    await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: submitInvoicePayload({ supplierId }),
    });
    await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: submitInvoicePayload({ supplierId }),
    });

    const auditRes = await injectAs(app, APPROVER_EMAIL, {
      method: "GET",
      url: "/v1/audit-logs?entityType=invoice",
    });

    expect(auditRes.statusCode).toBe(200);
    const body = auditRes.json();
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    for (const entry of body.data) {
      expect(entry.entityType).toBe("invoice");
    }
  });

  it("filters audit logs by action=invoice.submitted", async () => {
    const submitRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: submitInvoicePayload({ supplierId }),
    });
    expect(submitRes.statusCode).toBe(201);
    const invoiceId = submitRes.json().data.id;

    // Approve to generate a different action
    await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/approve-invoice",
      payload: approveInvoicePayload(invoiceId),
    });

    const auditRes = await injectAs(app, APPROVER_EMAIL, {
      method: "GET",
      url: "/v1/audit-logs?action=invoice.submitted",
    });

    expect(auditRes.statusCode).toBe(200);
    const body = auditRes.json();
    for (const entry of body.data) {
      expect(entry.action).toBe("invoice.submitted");
    }
  });

  it("GET /v1/audit-logs/:entityType/:entityId returns entity audit trail", async () => {
    // Submit & approve to generate 2 audit events for the same entity
    const submitRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: submitInvoicePayload({ supplierId }),
    });
    expect(submitRes.statusCode).toBe(201);
    const invoiceId = submitRes.json().data.id;

    await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/approve-invoice",
      payload: approveInvoicePayload(invoiceId),
    });

    // Get audit trail for this specific invoice
    const trailRes = await injectAs(app, APPROVER_EMAIL, {
      method: "GET",
      url: `/v1/audit-logs/invoice/${invoiceId}`,
    });

    expect(trailRes.statusCode).toBe(200);
    const body = trailRes.json();
    expect(body.data.length).toBeGreaterThanOrEqual(2);

    // Trail should be ordered by occurredAt ASC
    for (const entry of body.data) {
      expect(entry.entityType).toBe("invoice");
      expect(entry.entityId).toBe(invoiceId);
    }

    // First should be submitted, last should be approved
    expect(body.data[0].action).toBe("invoice.submitted");
    expect(body.data[body.data.length - 1].action).toBe("invoice.approved");
  });

  it("audit-logs supports cursor pagination", async () => {
    // Generate 3 invoices worth of audit data
    for (let i = 0; i < 3; i++) {
      await injectAs(app, SUBMITTER_EMAIL, {
        method: "POST",
        url: "/v1/commands/submit-invoice",
        payload: submitInvoicePayload({ supplierId }),
      });
    }

    // Page 1: limit=2
    const page1Res = await injectAs(app, APPROVER_EMAIL, {
      method: "GET",
      url: "/v1/audit-logs?limit=2",
    });
    expect(page1Res.statusCode).toBe(200);
    const page1 = page1Res.json();
    expect(page1.data).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.cursor).toBeTruthy();

    // Page 2: use cursor
    const page2Res = await injectAs(app, APPROVER_EMAIL, {
      method: "GET",
      url: `/v1/audit-logs?limit=2&cursor=${page1.cursor}`,
    });
    expect(page2Res.statusCode).toBe(200);
    const page2 = page2Res.json();
    expect(page2.data.length).toBeGreaterThanOrEqual(1);

    // No overlap between pages
    const page1Ids = new Set(page1.data.map((e: { id: string }) => e.id));
    for (const entry of page2.data) {
      expect(page1Ids.has(entry.id)).toBe(false);
    }
  });
});
