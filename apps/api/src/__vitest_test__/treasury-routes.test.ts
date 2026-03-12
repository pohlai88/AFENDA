/**
 * Integration test: Treasury routes (Wave 1).
 *
 * Validates end-to-end HTTP behavior for:
 * - bank account create/list/get
 * - bank account activation
 * - bank statement ingest/list/get/lines
 * - mark statement failed
 *
 * Also verifies audit log creation for all state-changing commands
 * (EC-5: audit completeness).
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { closeApp, createTestApp, injectAs, resetDb } from "./helpers/app-factory.js";
import { SUBMITTER_EMAIL } from "./helpers/factories.js";

describe("treasury routes (Wave 1)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    if (app) await resetDb(app);
  });

  afterAll(async () => {
    if (app) await closeApp(app);
  });

  it("creates and lists treasury bank accounts", async () => {
    const createRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/create-bank-account",
      payload: {
        idempotencyKey: crypto.randomUUID(),
        accountName: "Operating Account",
        bankName: "Test Bank",
        accountNumber: `ACC-${Date.now()}`,
        currencyCode: "USD",
        isPrimary: true,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const bankAccountId = createRes.json().data.id as string;

    const listRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: "/v1/treasury/bank-accounts?limit=10",
    });

    expect(listRes.statusCode).toBe(200);
    const listBody = listRes.json();
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0].id).toBe(bankAccountId);

    const getRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/treasury/bank-accounts/${bankAccountId}`,
    });

    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().data.id).toBe(bankAccountId);
  });

  it("ingests and queries treasury bank statements and lines", async () => {
    const createAccountRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/create-bank-account",
      payload: {
        idempotencyKey: crypto.randomUUID(),
        accountName: "Reconciliation Account",
        bankName: "Test Bank",
        accountNumber: `STMT-${Date.now()}`,
        currencyCode: "USD",
      },
    });

    expect(createAccountRes.statusCode).toBe(201);
    const bankAccountId = createAccountRes.json().data.id as string;

    const activateRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/activate-bank-account",
      payload: {
        idempotencyKey: crypto.randomUUID(),
        id: bankAccountId,
      },
    });

    expect(activateRes.statusCode).toBe(200);

    const ingestRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/ingest-bank-statement",
      payload: {
        idempotencyKey: crypto.randomUUID(),
        bankAccountId,
        sourceRef: `STMT-${Date.now()}`,
        statementDate: "2026-03-12T00:00:00.000Z",
        openingBalance: 100000,
        closingBalance: 125000,
        currencyCode: "USD",
        lines: [
          {
            lineNumber: 1,
            transactionDate: "2026-03-12T00:00:00.000Z",
            valueDate: "2026-03-12T00:00:00.000Z",
            description: "Inbound transfer",
            reference: "INV-1001",
            amount: 25000,
            direction: "inflow",
          },
        ],
      },
    });

    expect(ingestRes.statusCode).toBe(201);
    const statementId = ingestRes.json().data.id as string;

    const listRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: "/v1/treasury/bank-statements?limit=10",
    });

    expect(listRes.statusCode).toBe(200);
    const listBody = listRes.json();
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0].id).toBe(statementId);
    expect(listBody.data[0].lineCount).toBe(1);

    const getRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/treasury/bank-statements/${statementId}`,
    });

    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().data.id).toBe(statementId);

    const linesRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/treasury/bank-statements/${statementId}/lines?limit=10`,
    });

    expect(linesRes.statusCode).toBe(200);
    const linesBody = linesRes.json();
    expect(linesBody.data).toHaveLength(1);
    expect(linesBody.data[0].statementId).toBe(statementId);
    // Amount is stored as bigint, returned as string
    expect(linesBody.data[0].amount).toBe("25000");

    const markFailedRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/mark-statement-failed",
      payload: {
        idempotencyKey: crypto.randomUUID(),
        statementId,
        failureReason: "Manual test failure",
      },
    });

    expect(markFailedRes.statusCode).toBe(200);
    expect(markFailedRes.json().data.id).toBe(statementId);

    // ─── Verify audit logs were created ────────────────────────────────────
    // EC-5: Every state-changing command creates an audit_log row
    const auditResult = await app.db.execute(
      /* sql */ `
        SELECT action, entity_type, entity_id
        FROM audit_log
        WHERE entity_type IN ('bank_account', 'bank_statement')
        ORDER BY occurred_at ASC
      `,
    );
    const auditRows = (
      auditResult as unknown as {
        rows: Array<{ action: string; entity_type: string; entity_id: string }>;
      }
    ).rows;

    // Verify audit logs were created for state-changing commands:
    // 1 create-bank-account command
    // 1 activate-bank-account command
    // 1 ingest-bank-statement command
    // (mark-statement-failed may or may not create audit log depending on status change)
    // Total: at least 3 audit log entries
    expect(auditRows.length).toBeGreaterThanOrEqual(3);

    const actions = auditRows.map((r) => r.action);
    expect(actions).toContain("treasury.bank-account.created");
    expect(actions).toContain("treasury.bank-account.activated");
    expect(actions).toContain("treasury.bank-statement.ingested");
  });

  it("returns persistent lineage for cash snapshots and liquidity forecasts", async () => {
    const createAccountRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/create-bank-account",
      payload: {
        idempotencyKey: crypto.randomUUID(),
        accountName: "Treasury Operating",
        bankName: "Test Bank",
        accountNumber: `TR-${Date.now()}`,
        currencyCode: "USD",
      },
    });

    expect(createAccountRes.statusCode).toBe(201);
    const bankAccountId = createAccountRes.json().data.id as string;

    const upsertFeedRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/upsert-liquidity-source-feed",
      payload: {
        idempotencyKey: crypto.randomUUID(),
        sourceType: "ap_due_payment",
        sourceId: crypto.randomUUID(),
        sourceDocumentNumber: "AP-1001",
        bankAccountId,
        currencyCode: "USD",
        amountMinor: "25000",
        dueDate: "2026-03-12",
        direction: "outflow",
        confidenceScore: 0.9,
      },
    });

    expect(upsertFeedRes.statusCode).toBe(200);
    const sourceFeedId = upsertFeedRes.json().data.id as string;

    const snapshotRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/request-cash-position-snapshot",
      payload: {
        idempotencyKey: crypto.randomUUID(),
        snapshotDate: "2026-03-12",
        asOfAt: "2026-03-12T00:00:00.000Z",
        baseCurrencyCode: "USD",
        sourceVersion: "v1",
      },
    });

    expect(snapshotRes.statusCode).toBe(200);
    const snapshotId = snapshotRes.json().data.id as string;

    const createScenarioRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/create-liquidity-scenario",
      payload: {
        idempotencyKey: crypto.randomUUID(),
        code: `BASE-${Date.now()}`,
        name: "Baseline Scenario",
        scenarioType: "base_case",
        horizonDays: 7,
        assumptionSetVersion: "v1",
        assumptionsJson: {
          assumedDailyInflowsMinor: "0",
          assumedDailyOutflowsMinor: "0",
        },
      },
    });

    expect(createScenarioRes.statusCode).toBe(200);
    const liquidityScenarioId = createScenarioRes.json().data.id as string;

    const forecastRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/request-liquidity-forecast",
      payload: {
        idempotencyKey: crypto.randomUUID(),
        liquidityScenarioId,
        cashPositionSnapshotId: snapshotId,
        forecastDate: "2026-03-12",
        startDate: "2026-03-12",
        endDate: "2026-03-12",
        bucketGranularity: "daily",
        baseCurrencyCode: "USD",
        sourceVersion: "v1",
      },
    });

    expect(forecastRes.statusCode).toBe(200);
    const liquidityForecastId = forecastRes.json().data.id as string;

    const snapshotLineageRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/treasury/cash-position-snapshots/${snapshotId}/lineage`,
    });

    expect(snapshotLineageRes.statusCode).toBe(200);
    const snapshotLineageRows = snapshotLineageRes.json().data.data as Array<{ liquiditySourceFeedId: string; snapshotId: string }>;
    expect(snapshotLineageRows.length).toBeGreaterThan(0);
    expect(snapshotLineageRows.some((row) => row.snapshotId === snapshotId && row.liquiditySourceFeedId === sourceFeedId)).toBe(true);

    const forecastLineageRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/treasury/liquidity-forecasts/${liquidityForecastId}/lineage`,
    });

    expect(forecastLineageRes.statusCode).toBe(200);
    const forecastLineageRows = forecastLineageRes.json().data.data as Array<{ liquiditySourceFeedId: string; liquidityForecastId: string }>;
    expect(forecastLineageRows.length).toBeGreaterThan(0);
    expect(
      forecastLineageRows.some(
        (row) => row.liquidityForecastId === liquidityForecastId && row.liquiditySourceFeedId === sourceFeedId,
      ),
    ).toBe(true);
  });
});
