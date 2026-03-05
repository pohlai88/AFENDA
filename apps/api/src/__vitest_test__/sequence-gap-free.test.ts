/**
 * Integration test: Gap-free sequence numbers.
 *
 * Sprint 1 Exit Criterion EC-6:
 *   "Submitting 10 invoices produces invoice numbers INV-YYYY-0001
 *    through INV-YYYY-0010 with no gaps."
 *
 * Exercises: nextNumber() sequence allocation via submit-invoice command.
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
  submitInvoicePayload,
  getTestSupplierId,
} from "./helpers/factories.js";

describe("gap-free sequence numbers (EC-6)", () => {
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

  it("10 sequential submissions produce gap-free invoice numbers", async () => {
    const numbers: string[] = [];
    const year = new Date().getUTCFullYear();

    for (let i = 0; i < 10; i++) {
      const res = await injectAs(app, SUBMITTER_EMAIL, {
        method: "POST",
        url: "/v1/commands/submit-invoice",
        payload: submitInvoicePayload({
          supplierId,
          amountMinor: (i + 1) * 100_00,
        }),
      });
      expect(res.statusCode).toBe(201);
      numbers.push(res.json().data.invoiceNumber);
    }

    // Verify gap-free sequence
    for (let i = 0; i < 10; i++) {
      const expected = `INV-${year}-${String(i + 1).padStart(4, "0")}`;
      expect(numbers[i]).toBe(expected);
    }
  });
});
