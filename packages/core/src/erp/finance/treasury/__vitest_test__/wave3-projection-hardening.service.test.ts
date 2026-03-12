import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  tableRefs: {
    bankAccount: { name: "bankAccount" },
    liquiditySourceFeed: { name: "liquiditySourceFeed" },
    cashPositionSnapshot: { name: "cashPositionSnapshot" },
    cashPositionSnapshotLine: { name: "cashPositionSnapshotLine" },
    cashPositionSnapshotLineage: { name: "cashPositionSnapshotLineage" },
    liquidityScenario: { name: "liquidityScenario" },
    liquidityForecast: { name: "liquidityForecast" },
    liquidityForecastBucket: { name: "liquidityForecastBucket" },
    liquidityForecastBucketLineage: { name: "liquidityForecastBucketLineage" },
    outboxEvent: { name: "outboxEvent" },
  },
  activeTx: null as Record<string, unknown> | null,
  auditEntries: [] as Array<Record<string, unknown>>,
  normalizeToBase: vi.fn(),
}));

vi.mock("@afenda/db", () => ({
  ...mockState.tableRefs,
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    and: vi.fn((..._args: unknown[]) => ({ __op: "and" })),
    eq: vi.fn((_a: unknown, _b: unknown) => ({ __op: "eq" })),
    gte: vi.fn((_a: unknown, _b: unknown) => ({ __op: "gte" })),
    lte: vi.fn((_a: unknown, _b: unknown) => ({ __op: "lte" })),
    sql: Object.assign(vi.fn((_parts: TemplateStringsArray, ..._vals: unknown[]) => ({ __op: "sql" })), {
      raw: vi.fn((s: string) => s),
    }),
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(async (_db: unknown, _ctx: unknown, entry: Record<string, unknown>, fn: (tx: unknown) => Promise<unknown>) => {
    mockState.auditEntries.push(entry);
    return fn(mockState.activeTx ?? _db);
  }),
}));

vi.mock("../fx-normalization.service", () => ({
  normalizeToBase: mockState.normalizeToBase,
}));

import {
  requestCashPositionSnapshot,
} from "../cash-position-snapshot.service";
import {
  requestLiquidityForecast,
} from "../liquidity-forecast.service";

function makeWhereResult(rows: unknown[]) {
  const promise = Promise.resolve(rows);
  return {
    limit: vi.fn(async (_n: number) => rows),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  } as unknown as Promise<unknown[]> & { limit: (n: number) => Promise<unknown[]> };
}

function createDb(selectQueue: unknown[][]) {
  let selectIdx = 0;
  let nextId = 1;
  const inserted: Array<{ table: unknown; values: unknown }> = [];

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => makeWhereResult((selectQueue[selectIdx++] ?? []) as unknown[])),
      })),
    })),
  } as Record<string, unknown>;

  const tx = {
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: unknown) => {
        inserted.push({ table, values });
        if (table === mockState.tableRefs.cashPositionSnapshot) {
          return { returning: vi.fn(async () => [{ id: "snap-1" }]) };
        }
        if (table === mockState.tableRefs.liquidityForecast) {
          return { returning: vi.fn(async () => [{ id: "lf-1" }]) };
        }
        if (table === mockState.tableRefs.cashPositionSnapshotLine) {
          const rows = Array.isArray(values) ? values : [values];
          return {
            returning: vi.fn(async () =>
              rows.map((row) => ({
                id: `snap-line-${nextId++}`,
                sourceId: (row as { sourceId?: string }).sourceId ?? null,
              })),
            ),
          };
        }
        if (table === mockState.tableRefs.liquidityForecastBucket) {
          const rows = Array.isArray(values) ? values : [values];
          return {
            returning: vi.fn(async () =>
              rows.map((row) => ({
                id: `bucket-${nextId++}`,
                bucketStartDate: (row as { bucketStartDate?: string }).bucketStartDate ?? "1970-01-01",
              })),
            ),
          };
        }
        return { returning: vi.fn(async () => []) };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => []) })),
    })),
  };

  return { db, tx, inserted };
}

beforeEach(() => {
  mockState.activeTx = null;
  mockState.auditEntries.length = 0;
  mockState.normalizeToBase.mockReset();
  mockState.normalizeToBase.mockImplementation(
    async (_db: unknown, params: { amountMinor: string; fromCurrencyCode: string; toCurrencyCode: string }) => ({
      ok: true,
      data: {
        normalizedMinor: params.amountMinor,
        fxRateSnapshotId: params.fromCurrencyCode === params.toCurrencyCode ? null : "fx-1",
      },
    }),
  );
});

describe("Wave 3 projection hardening", () => {
  it("normalizes mixed-currency cash snapshot feeds when FX exists", async () => {
    const { db, tx } = createDb([
      [{ id: "ba-1", currencyCode: "EUR" }],
      [{
        id: "feed-1",
        sourceType: "ar_expected_receipt",
        bankAccountId: null,
        currencyCode: "EUR",
        amountMinor: "10",
        dueDate: "2026-03-12",
        direction: "inflow",
      }],
    ]);
    mockState.activeTx = tx;
    mockState.normalizeToBase.mockResolvedValueOnce({
      ok: true,
      data: { normalizedMinor: "11", fxRateSnapshotId: "fx-1" },
    });

    const result = await requestCashPositionSnapshot(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        snapshotDate: "2026-03-12",
        asOfAt: "2026-03-12T00:00:00.000Z",
        baseCurrencyCode: "USD",
        sourceVersion: "v1",
      },
    );

    expect(result.ok).toBe(true);
  });

  it("returns not-found when mixed-currency forecast lacks FX rate coverage", async () => {
    const { db } = createDb([
      [{ id: "sc-1", assumptionSetVersion: "v1", assumptionsJson: {} }],
      [{ id: "snap-1", totalProjectedAvailableMinor: "0" }],
      [],
      [{ id: "feed-1", dueDate: "2026-03-12", direction: "inflow", amountMinor: "10", currencyCode: "EUR" }],
    ]);
    mockState.normalizeToBase.mockResolvedValueOnce({
      ok: false,
      error: {
        code: "TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND",
        message: "FX rate snapshot not found",
      },
    });

    const result = await requestLiquidityForecast(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        liquidityScenarioId: "sc-1" as never,
        cashPositionSnapshotId: "snap-1",
        forecastDate: "2026-03-12",
        startDate: "2026-03-12",
        endDate: "2026-03-12",
        bucketGranularity: "daily",
        baseCurrencyCode: "USD",
        sourceVersion: "v1",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND");
    }
  });

  it("reuses existing liquidity forecast for reproducibility key", async () => {
    const { db } = createDb([
      [{ id: "sc-1", assumptionSetVersion: "v1", assumptionsJson: {} }],
      [{ id: "snap-1", totalProjectedAvailableMinor: "0" }],
      [{ id: "lf-existing" }],
    ]);

    const result = await requestLiquidityForecast(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        liquidityScenarioId: "sc-1" as never,
        cashPositionSnapshotId: "snap-1",
        forecastDate: "2026-03-12",
        startDate: "2026-03-12",
        endDate: "2026-03-12",
        bucketGranularity: "daily",
        baseCurrencyCode: "USD",
        sourceVersion: "v1",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("lf-existing");
    }
  });

  it("captures source-row lineage in snapshot outbox payload", async () => {
    const { db, tx, inserted } = createDb([
      [{ id: "ba-1", currencyCode: "USD" }],
      [{
        id: "feed-1",
        sourceType: "ap_due_payment",
        bankAccountId: "ba-1",
        currencyCode: "USD",
        amountMinor: "100",
        dueDate: "2026-03-12",
        direction: "outflow",
      }],
    ]);
    mockState.activeTx = tx;

    const result = await requestCashPositionSnapshot(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        snapshotDate: "2026-03-12",
        asOfAt: "2026-03-12T00:00:00.000Z",
        baseCurrencyCode: "USD",
        sourceVersion: "v1",
      },
    );

    expect(result.ok).toBe(true);

    const outboxInsert = inserted.find((x) => x.table === mockState.tableRefs.outboxEvent);
    expect(outboxInsert).toBeDefined();
    const outboxPayload = (outboxInsert?.values as { payload: { sourceLineage: { liquidityFeedSourceIds: string[] } } }).payload;
    expect(outboxPayload.sourceLineage.liquidityFeedSourceIds).toEqual(["feed-1"]);

    const lines = inserted
      .filter((x) => x.table === mockState.tableRefs.cashPositionSnapshotLine && Array.isArray(x.values))
      .flatMap((x) => x.values as Array<{ lineDescription?: string }>);
    expect(lines.some((line) => line.lineDescription?.includes("feed-1"))).toBe(true);

    const lineageInsert = inserted.find((x) => x.table === mockState.tableRefs.cashPositionSnapshotLineage);
    expect(lineageInsert).toBeDefined();
    expect(Array.isArray(lineageInsert?.values)).toBe(true);
    expect((lineageInsert?.values as Array<{ liquiditySourceFeedId: string }>)?.[0]?.liquiditySourceFeedId).toBe("feed-1");
  });

  it("captures source-row lineage by bucket in forecast outbox payload", async () => {
    const { db, tx, inserted } = createDb([
      [{ id: "sc-1", assumptionSetVersion: "v1", assumptionsJson: { assumedDailyInflowsMinor: "0", assumedDailyOutflowsMinor: "0" } }],
      [{ id: "snap-1", totalProjectedAvailableMinor: "1000" }],
      [],
      [{ id: "feed-1", dueDate: "2026-03-12", direction: "inflow", amountMinor: "50", currencyCode: "USD" }],
    ]);
    mockState.activeTx = tx;

    const result = await requestLiquidityForecast(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        liquidityScenarioId: "sc-1" as never,
        cashPositionSnapshotId: "snap-1",
        forecastDate: "2026-03-12",
        startDate: "2026-03-12",
        endDate: "2026-03-12",
        bucketGranularity: "daily",
        baseCurrencyCode: "USD",
        sourceVersion: "v1",
      },
    );

    expect(result.ok).toBe(true);

    const outboxInsert = inserted.find((x) => x.table === mockState.tableRefs.outboxEvent);
    expect(outboxInsert).toBeDefined();
    const outboxPayload = (outboxInsert?.values as {
      payload: { sourceLineage: { sourceFeedIds: string[]; bucketSourceIdsByDate: Record<string, string[]> } };
    }).payload;
    expect(outboxPayload.sourceLineage.sourceFeedIds).toEqual(["feed-1"]);
    expect(outboxPayload.sourceLineage.bucketSourceIdsByDate["2026-03-12"]).toEqual(["feed-1"]);

    const forecastAudit = mockState.auditEntries.find((entry) => entry.action === "treasury.liquidity-forecast.calculated") as
      | { details?: { sourceFeedIds?: string[] } }
      | undefined;
    expect(forecastAudit?.details?.sourceFeedIds).toEqual(["feed-1"]);

    const lineageInsert = inserted.find((x) => x.table === mockState.tableRefs.liquidityForecastBucketLineage);
    expect(lineageInsert).toBeDefined();
    expect(Array.isArray(lineageInsert?.values)).toBe(true);
    expect((lineageInsert?.values as Array<{ liquiditySourceFeedId: string }>)?.[0]?.liquiditySourceFeedId).toBe("feed-1");
  });
});
