import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  tableRefs: {
    cashPositionSnapshot: { name: "cashPositionSnapshot" },
    liquidityForecast: { name: "liquidityForecast" },
    liquidityForecastBucket: { name: "liquidityForecastBucket" },
    liquidityForecastBucketLineage: { name: "liquidityForecastBucketLineage" },
    liquidityScenario: { name: "liquidityScenario" },
    liquiditySourceFeed: { name: "liquiditySourceFeed" },
    outboxEvent: { name: "outboxEvent" },
  },
  activeTx: null as Record<string, unknown> | null,
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
    sql: Object.assign(
      vi.fn((_parts: TemplateStringsArray, ..._vals: unknown[]) => ({ __op: "sql" })),
      { raw: vi.fn((s: string) => s) },
    ),
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(
    async (_db: unknown, _ctx: unknown, _entry: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockState.activeTx ?? _db),
  ),
}));

vi.mock("../fx-normalization.service", () => ({
  normalizeToBase: mockState.normalizeToBase,
}));

import {
  activateLiquidityScenario,
  createLiquidityScenario,
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
  let nextBucketId = 1;
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
        if (table === mockState.tableRefs.liquidityScenario) {
          return { returning: vi.fn(async () => [{ id: "sc-1" }]) };
        }
        if (table === mockState.tableRefs.liquidityForecast) {
          return { returning: vi.fn(async () => [{ id: "lf-1" }]) };
        }
        if (table === mockState.tableRefs.liquidityForecastBucket) {
          const rows = Array.isArray(values) ? values : [values];
          return {
            returning: vi.fn(async () =>
              rows.map((row) => ({
                id: `bucket-${nextBucketId++}`,
                bucketStartDate: (row as { bucketStartDate?: string }).bucketStartDate ?? "1970-01-01",
              })),
            ),
          };
        }
        return { returning: vi.fn(async () => []) };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
  };

  return { db, tx, inserted };
}

beforeEach(() => {
  mockState.activeTx = null;
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

describe("liquidity-forecast service", () => {
  it("rejects duplicate liquidity scenario code", async () => {
    const { db } = createDb([[{ id: "sc-existing" }]]);

    const result = await createLiquidityScenario(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        code: "BASE-001",
        name: "Base",
        scenarioType: "base_case",
        horizonDays: 30,
        assumptionSetVersion: "v1",
        assumptionsJson: {},
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_LIQUIDITY_SCENARIO_CODE_EXISTS");
    }
  });

  it("returns existing forecast id for deterministic replay", async () => {
    const { db } = createDb([
      [{ id: "sc-1", assumptionSetVersion: "v1", assumptionsJson: {} }],
      [{ id: "snap-1", totalProjectedAvailableMinor: "1000" }],
      [{ id: "lf-existing" }],
    ]);

    const result = await requestLiquidityForecast(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-2" as never,
      {
        liquidityScenarioId: "sc-1" as never,
        cashPositionSnapshotId: "snap-1",
        forecastDate: "2026-03-12",
        startDate: "2026-03-12",
        endDate: "2026-03-12",
        bucketGranularity: "daily",
        baseCurrencyCode: "USD",
        sourceVersion: "replay-key",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("lf-existing");
    }
  });

  it("creates forecast, buckets, lineage rows, and outbox", async () => {
    const { db, tx, inserted } = createDb([
      [{ id: "sc-1", assumptionSetVersion: "v1", assumptionsJson: { assumedDailyInflowsMinor: "0", assumedDailyOutflowsMinor: "0" } }],
      [{ id: "snap-1", totalProjectedAvailableMinor: "1000" }],
      [],
      [{ id: "feed-1", dueDate: "2026-03-12", direction: "inflow", amountMinor: "15", currencyCode: "USD" }],
    ]);
    mockState.activeTx = tx;

    const result = await requestLiquidityForecast(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-3" as never,
      {
        liquidityScenarioId: "sc-1" as never,
        cashPositionSnapshotId: "snap-1",
        forecastDate: "2026-03-12",
        startDate: "2026-03-12",
        endDate: "2026-03-12",
        bucketGranularity: "daily",
        baseCurrencyCode: "USD",
        sourceVersion: "v2",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("lf-1");
    }

    const lineageInsert = inserted.find((x) => x.table === mockState.tableRefs.liquidityForecastBucketLineage);
    expect(lineageInsert).toBeDefined();

    const outboxInsert = inserted.find((x) => x.table === mockState.tableRefs.outboxEvent);
    expect((outboxInsert?.values as { type?: string }).type).toBe("TREAS.LIQUIDITY_FORECAST_CALCULATED");
  });

  it("normalizes mixed-currency source feeds into base-currency forecast buckets", async () => {
    const { db, tx, inserted } = createDb([
      [{ id: "sc-1", assumptionSetVersion: "v1", assumptionsJson: { assumedDailyInflowsMinor: "0", assumedDailyOutflowsMinor: "0" } }],
      [{ id: "snap-1", totalProjectedAvailableMinor: "1000" }],
      [],
      [{ id: "feed-1", dueDate: "2026-03-12", direction: "inflow", amountMinor: "100", currencyCode: "EUR" }],
    ]);
    mockState.activeTx = tx;
    mockState.normalizeToBase.mockResolvedValueOnce({
      ok: true,
      data: { normalizedMinor: "110", fxRateSnapshotId: "fx-1" },
    });

    const result = await requestLiquidityForecast(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-3b" as never,
      {
        liquidityScenarioId: "sc-1" as never,
        cashPositionSnapshotId: "snap-1",
        forecastDate: "2026-03-12",
        startDate: "2026-03-12",
        endDate: "2026-03-12",
        bucketGranularity: "daily",
        baseCurrencyCode: "USD",
        sourceVersion: "v2",
      },
    );

    expect(result.ok).toBe(true);
    const bucketInsert = inserted.find((x) => x.table === mockState.tableRefs.liquidityForecastBucket);
    expect(bucketInsert).toBeDefined();
    expect(((bucketInsert?.values as Array<{ expectedInflowsMinor: string }>)[0])?.expectedInflowsMinor).toBe("110");
  });

  it("returns not-found when a mixed-currency forecast lacks an FX rate snapshot", async () => {
    const { db } = createDb([
      [{ id: "sc-1", assumptionSetVersion: "v1", assumptionsJson: {} }],
      [{ id: "snap-1", totalProjectedAvailableMinor: "1000" }],
      [],
      [{ id: "feed-1", dueDate: "2026-03-12", direction: "inflow", amountMinor: "100", currencyCode: "EUR" }],
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
      "corr-3c" as never,
      {
        liquidityScenarioId: "sc-1" as never,
        cashPositionSnapshotId: "snap-1",
        forecastDate: "2026-03-12",
        startDate: "2026-03-12",
        endDate: "2026-03-12",
        bucketGranularity: "daily",
        baseCurrencyCode: "USD",
        sourceVersion: "v2",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND");
    }
  });

  it("returns not-found when activating unknown scenario", async () => {
    const { db } = createDb([[]]);

    const result = await activateLiquidityScenario(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-4" as never,
      { liquidityScenarioId: "sc-missing" as never },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_LIQUIDITY_SCENARIO_NOT_FOUND");
    }
  });
  it("buckets heterogeneous feed dates into separate daily buckets", async () => {
    const { db, tx, inserted } = createDb([
      [{ id: "sc-1", assumptionSetVersion: "v1", assumptionsJson: { assumedDailyInflowsMinor: "0", assumedDailyOutflowsMinor: "0" } }],
      [{ id: "snap-1", totalProjectedAvailableMinor: "1000" }],
      [],
      [
        { id: "feed-1", dueDate: "2026-03-12", direction: "inflow", amountMinor: "100", currencyCode: "USD" },
        { id: "feed-2", dueDate: "2026-03-13", direction: "inflow", amountMinor: "200", currencyCode: "USD" },
        { id: "feed-3", dueDate: "2026-03-14", direction: "outflow", amountMinor: "50", currencyCode: "USD" },
      ],
    ]);
    mockState.activeTx = tx;

    const result = await requestLiquidityForecast(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-hetero" as never,
      {
        liquidityScenarioId: "sc-1" as never,
        cashPositionSnapshotId: "snap-1",
        forecastDate: "2026-03-12",
        startDate: "2026-03-12",
        endDate: "2026-03-14",
        bucketGranularity: "daily",
        baseCurrencyCode: "USD",
        sourceVersion: "v3",
      },
    );

    expect(result.ok).toBe(true);
    const bucketInsert = inserted.find((x) => x.table === mockState.tableRefs.liquidityForecastBucket);
    expect(bucketInsert).toBeDefined();
    const buckets = bucketInsert?.values as Array<{ bucketStartDate: string; expectedInflowsMinor: string; expectedOutflowsMinor: string }>;
    expect(buckets.length).toBe(3);
    expect(buckets[0]?.expectedInflowsMinor).toBe("100"); // 2026-03-12
    expect(buckets[1]?.expectedInflowsMinor).toBe("200"); // 2026-03-13
    expect(buckets[2]?.expectedOutflowsMinor).toBe("50"); // 2026-03-14
  });

  it("preserves FX rate snapshot IDs in bucket lineage for multi-currency forecasts", async () => {
    const { db, tx, inserted } = createDb([
      [{ id: "sc-1", assumptionSetVersion: "v1", assumptionsJson: { assumedDailyInflowsMinor: "0", assumedDailyOutflowsMinor: "0" } }],
      [{ id: "snap-1", totalProjectedAvailableMinor: "1000" }],
      [],
      [
        { id: "feed-1", dueDate: "2026-03-12", direction: "inflow", amountMinor: "100", currencyCode: "EUR" },
        { id: "feed-2", dueDate: "2026-03-12", direction: "outflow", amountMinor: "50", currencyCode: "GBP" },
      ],
    ]);
    mockState.activeTx = tx;
    let callIdx = 0;
    mockState.normalizeToBase.mockImplementation(async (_db: unknown, params: { fromCurrencyCode: string }) => {
      const fxIds: Record<string, string> = { EUR: "fx-eur-usd", GBP: "fx-gbp-usd" };
      return {
        ok: true,
        data: {
          normalizedMinor: params.fromCurrencyCode === "EUR" ? "110" : "63",
          fxRateSnapshotId: fxIds[params.fromCurrencyCode] ?? null,
        },
      };
    });

    const result = await requestLiquidityForecast(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-fx-lineage" as never,
      {
        liquidityScenarioId: "sc-1" as never,
        cashPositionSnapshotId: "snap-1",
        forecastDate: "2026-03-12",
        startDate: "2026-03-12",
        endDate: "2026-03-12",
        bucketGranularity: "daily",
        baseCurrencyCode: "USD",
        sourceVersion: "v4",
      },
    );

    expect(result.ok).toBe(true);
    const lineageInsert = inserted.find((x) => x.table === mockState.tableRefs.liquidityForecastBucketLineage);
    expect(lineageInsert).toBeDefined();
    const lineageRows = lineageInsert?.values as Array<{ liquiditySourceFeedId: string; fxRateSnapshotId?: string }>;
    expect(lineageRows.length).toBe(2);
    const eurRow = lineageRows.find((row) => row.liquiditySourceFeedId === "feed-1");
    const gbpRow = lineageRows.find((row) => row.liquiditySourceFeedId === "feed-2");
    expect(eurRow?.fxRateSnapshotId).toBe("fx-eur-usd");
    expect(gbpRow?.fxRateSnapshotId).toBe("fx-gbp-usd");
  });

  it("creates independent bucket lineage records per-feed to preserve FX provenance", async () => {
    const { db, tx, inserted } = createDb([
      [{ id: "sc-1", assumptionSetVersion: "v1", assumptionsJson: { assumedDailyInflowsMinor: "0", assumedDailyOutflowsMinor: "0" } }],
      [{ id: "snap-1", totalProjectedAvailableMinor: "1000" }],
      [],
      [
        { id: "feed-1", dueDate: "2026-03-12", direction: "inflow", amountMinor: "100", currencyCode: "USD" },
        { id: "feed-2", dueDate: "2026-03-12", direction: "inflow", amountMinor: "200", currencyCode: "USD" },
      ],
    ]);
    mockState.activeTx = tx;

    const result = await requestLiquidityForecast(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-feed-lineage" as never,
      {
        liquidityScenarioId: "sc-1" as never,
        cashPositionSnapshotId: "snap-1",
        forecastDate: "2026-03-12",
        startDate: "2026-03-12",
        endDate: "2026-03-12",
        bucketGranularity: "daily",
        baseCurrencyCode: "USD",
        sourceVersion: "v5",
      },
    );

    expect(result.ok).toBe(true);
    const lineageInsert = inserted.find((x) => x.table === mockState.tableRefs.liquidityForecastBucketLineage);
    expect(lineageInsert).toBeDefined();
    const lineageRows = lineageInsert?.values as Array<{ liquiditySourceFeedId: string }>;
    expect(lineageRows.length).toBe(2);
    expect(lineageRows.some((row) => row.liquiditySourceFeedId === "feed-1")).toBe(true);
    expect(lineageRows.some((row) => row.liquiditySourceFeedId === "feed-2")).toBe(true);
  });});
