import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  tableRefs: {
    liquidityForecast: { name: "liquidityForecast" },
    liquidityForecastBucket: { name: "liquidityForecastBucket" },
    forecastVariance: { name: "forecastVariance" },
    outboxEvent: { name: "outboxEvent" },
  },
  activeTx: null as Record<string, unknown> | null,
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
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(
    async (_db: unknown, _ctx: unknown, _entry: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockState.activeTx ?? _db),
  ),
}));

import { recordForecastVariance } from "../forecast-variance.service";

function makeWhereResult(rows: unknown[]) {
  const promise = Promise.resolve(rows);
  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  } as Promise<unknown[]>;
}

function createDb(selectQueue: unknown[][]) {
  let selectIdx = 0;
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
        if (table === mockState.tableRefs.forecastVariance) {
          return { returning: vi.fn(async () => [{ id: "fv-1" }]) };
        }
        return { returning: vi.fn(async () => []) };
      }),
    })),
  };

  return { db, tx, inserted };
}

beforeEach(() => {
  mockState.activeTx = null;
});

describe("forecast-variance service", () => {
  it("returns not found when forecast is missing", async () => {
    const { db } = createDb([[]]);

    const result = await recordForecastVariance(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        liquidityForecastId: "lf-1" as never,
        bucketId: "bucket-1" as never,
        actualInflowsMinor: "10",
        actualOutflowsMinor: "20",
        actualClosingBalanceMinor: "90",
        measuredAt: "2026-03-12T00:00:00.000Z",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_LIQUIDITY_FORECAST_NOT_FOUND");
    }
  });

  it("returns not found when forecast bucket is missing", async () => {
    const { db } = createDb([[{ id: "lf-1" }], []]);

    const result = await recordForecastVariance(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-2" as never,
      {
        liquidityForecastId: "lf-1" as never,
        bucketId: "bucket-1" as never,
        actualInflowsMinor: "10",
        actualOutflowsMinor: "20",
        actualClosingBalanceMinor: "90",
        measuredAt: "2026-03-12T00:00:00.000Z",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_LIQUIDITY_FORECAST_BUCKET_NOT_FOUND");
    }
  });

  it("records variance and emits outbox", async () => {
    const { db, tx, inserted } = createDb([
      [{ id: "lf-1" }],
      [{ id: "bucket-1", expectedInflowsMinor: "100", expectedOutflowsMinor: "80", closingBalanceMinor: "20" }],
    ]);
    mockState.activeTx = tx;

    const result = await recordForecastVariance(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-3" as never,
      {
        liquidityForecastId: "lf-1" as never,
        bucketId: "bucket-1" as never,
        actualInflowsMinor: "90",
        actualOutflowsMinor: "110",
        actualClosingBalanceMinor: "-20",
        measuredAt: "2026-03-12T00:00:00.000Z",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("fv-1");
    }

    const varianceInsert = inserted.find((x) => x.table === mockState.tableRefs.forecastVariance);
    expect(varianceInsert).toBeDefined();
    expect((varianceInsert?.values as { inflowVarianceMinor?: string }).inflowVarianceMinor).toBe("-10");

    const outboxInsert = inserted.find((x) => x.table === mockState.tableRefs.outboxEvent);
    expect((outboxInsert?.values as { type?: string }).type).toBe("TREAS.FORECAST_VARIANCE_RECORDED");
  });
});
