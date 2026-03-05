/**
 * Integration test: Cursor pagination.
 *
 * Sprint 1 Exit Criterion EC-7:
 *   "Listing 25 invoices with limit=10 paginates correctly across
 *    3 pages: 10, 10, 5 items. hasMore flag is accurate."
 *
 * Exercises: cursor pagination at the HTTP layer (GET /v1/invoices).
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, injectAs, resetDb, closeApp } from "./helpers/app-factory.js";
import { SUBMITTER_EMAIL, submitInvoicePayload, getTestSupplierId } from "./helpers/factories.js";

describe("cursor pagination (EC-7)", () => {
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

  it("25 invoices paginate as 10 + 10 + 5 with correct hasMore", async () => {
    // Create 25 invoices
    for (let i = 0; i < 25; i++) {
      const res = await injectAs(app, SUBMITTER_EMAIL, {
        method: "POST",
        url: "/v1/commands/submit-invoice",
        payload: submitInvoicePayload({
          supplierId,
          amountMinor: (i + 1) * 100_00,
        }),
      });
      expect(res.statusCode).toBe(201);
    }

    // Page 1: limit=10
    const page1Res = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: "/v1/invoices?limit=10",
    });
    expect(page1Res.statusCode).toBe(200);
    const page1 = page1Res.json();
    expect(page1.data).toHaveLength(10);
    expect(page1.hasMore).toBe(true);
    expect(page1.cursor).toBeTruthy();

    // Page 2: cursor from page 1
    const page2Res = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/invoices?limit=10&cursor=${page1.cursor}`,
    });
    expect(page2Res.statusCode).toBe(200);
    const page2 = page2Res.json();
    expect(page2.data).toHaveLength(10);
    expect(page2.hasMore).toBe(true);
    expect(page2.cursor).toBeTruthy();

    // Page 3: cursor from page 2
    const page3Res = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/invoices?limit=10&cursor=${page2.cursor}`,
    });
    expect(page3Res.statusCode).toBe(200);
    const page3 = page3Res.json();
    expect(page3.data).toHaveLength(5);
    expect(page3.hasMore).toBe(false);

    // Verify no duplicate IDs across pages
    const allIds = [
      ...page1.data.map((d: { id: string }) => d.id),
      ...page2.data.map((d: { id: string }) => d.id),
      ...page3.data.map((d: { id: string }) => d.id),
    ];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(25);
  });
});
