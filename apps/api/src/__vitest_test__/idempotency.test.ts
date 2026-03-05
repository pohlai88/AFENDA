/**
 * Integration test: Idempotency replay.
 *
 * Sprint 1 Exit Criterion EC-4:
 *   "Replaying an invoice submission with the same idempotency key
 *    returns the cached response (same ID, no duplicate row)."
 *
 * Exercises: idempotency plugin at the HTTP layer.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, injectAs, resetDb, closeApp } from "./helpers/app-factory.js";
import { SUBMITTER_EMAIL, getTestSupplierId } from "./helpers/factories.js";

describe("idempotency replay (EC-4)", () => {
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

  it("replaying the same submit-invoice returns identical response without creating a duplicate", async () => {
    const fixedKey = `idempotency-test-${Date.now()}`;
    const payload = {
      idempotencyKey: fixedKey,
      supplierId,
      amountMinor: 200_00,
      currencyCode: "USD",
    };

    // First request
    const res1 = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload,
    });
    expect(res1.statusCode).toBe(201);
    const id1 = res1.json().data.id;

    // Replay — same key, same payload
    const res2 = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload,
    });

    // Should return the cached response (200 or 201) with the same invoice ID
    expect([200, 201]).toContain(res2.statusCode);
    const id2 = res2.json().data.id;
    expect(id2).toBe(id1);

    // Verify only 1 invoice exists
    const listRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: "/v1/invoices?limit=50",
    });
    expect(listRes.statusCode).toBe(200);
    const invoices = listRes.json().data;
    expect(invoices).toHaveLength(1);
  });

  it("reusing a key with different payload returns 409", async () => {
    const fixedKey = `idempotency-conflict-${Date.now()}`;

    // First request
    const res1 = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: {
        idempotencyKey: fixedKey,
        supplierId,
        amountMinor: 100_00,
        currencyCode: "USD",
      },
    });
    expect(res1.statusCode).toBe(201);

    // Second request — same key, DIFFERENT payload
    const res2 = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: {
        idempotencyKey: fixedKey,
        supplierId,
        amountMinor: 999_99, // different amount
        currencyCode: "USD",
      },
    });

    expect(res2.statusCode).toBe(409);
  });
});
