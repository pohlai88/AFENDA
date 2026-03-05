/**
 * Integration test: Journal balance invariant.
 *
 * Sprint 1 Exit Criterion EC-3:
 *   "An unbalanced journal entry is rejected with 400."
 *
 * Exercises: post-to-gl validation at the HTTP layer.
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
  APPROVER_EMAIL,
  uniqueKey,
  getAccountIdByCode,
} from "./helpers/factories.js";

describe("journal balance invariant (EC-3)", () => {
  let app: FastifyInstance;
  let debitAccountId: string;
  let creditAccountId: string;

  beforeAll(async () => {
    app = await createTestApp();
    debitAccountId = await getAccountIdByCode(app, "5000");
    creditAccountId = await getAccountIdByCode(app, "2000");
  });

  afterEach(async () => {
    if (app) await resetDb(app);
  });

  afterAll(async () => {
    if (app) await closeApp(app);
  });

  it("rejects unbalanced journal entry with 400", async () => {
    const res = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/post-to-gl",
      payload: {
        idempotencyKey: uniqueKey("unbal"),
        correlationId: crypto.randomUUID(),
        memo: "Unbalanced test",
        lines: [
          {
            accountId: debitAccountId,
            debitMinor: 100_00,
            currencyCode: "USD",
          },
          {
            accountId: creditAccountId,
            creditMinor: 99_99, // intentionally off by 1
            currencyCode: "USD",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("accepts balanced journal entry with 201", async () => {
    const res = await injectAs(app, APPROVER_EMAIL, {
      method: "POST",
      url: "/v1/commands/post-to-gl",
      payload: {
        idempotencyKey: uniqueKey("bal"),
        correlationId: crypto.randomUUID(),
        memo: "Balanced test",
        lines: [
          {
            accountId: debitAccountId,
            debitMinor: 100_00,
            currencyCode: "USD",
          },
          {
            accountId: creditAccountId,
            creditMinor: 100_00,
            currencyCode: "USD",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
  });
});
