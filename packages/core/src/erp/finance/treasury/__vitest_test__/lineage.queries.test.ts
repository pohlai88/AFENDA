import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  tableRefs: {
    cashPositionSnapshotLineage: { name: "cashPositionSnapshotLineage", createdAt: "createdAt" },
    liquidityForecastBucketLineage: { name: "liquidityForecastBucketLineage", createdAt: "createdAt" },
  },
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
    asc: vi.fn((_a: unknown) => ({ __op: "asc" })),
  };
});

import {
  listCashPositionSnapshotLineage,
  listLiquidityForecastBucketLineage,
} from "../lineage.queries";

function createDb(snapshotRows: unknown[], forecastRows: unknown[]) {
  const db = {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(async () =>
            table === mockState.tableRefs.cashPositionSnapshotLineage
              ? snapshotRows
              : forecastRows,
          ),
        })),
      })),
    })),
  };

  return db;
}

describe("lineage queries", () => {
  it("lists snapshot lineage rows", async () => {
    const rows = [
      {
        id: "lin-1",
        orgId: "org-1",
        snapshotId: "snap-1",
        snapshotLineId: "line-1",
        liquiditySourceFeedId: "feed-1",
        createdAt: new Date("2026-03-12T00:00:00.000Z"),
      },
    ];
    const db = createDb(rows, []);

    const result = await listCashPositionSnapshotLineage(db as never, "org-1" as never, "snap-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.snapshotLineId).toBe("line-1");
    expect(result[0]?.liquiditySourceFeedId).toBe("feed-1");
  });

  it("lists forecast bucket lineage rows", async () => {
    const rows = [
      {
        id: "lin-2",
        orgId: "org-1",
        liquidityForecastId: "lf-1",
        bucketId: "bucket-1",
        liquiditySourceFeedId: "feed-2",
        createdAt: new Date("2026-03-12T01:00:00.000Z"),
      },
    ];
    const db = createDb([], rows);

    const result = await listLiquidityForecastBucketLineage(db as never, "org-1" as never, "lf-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.bucketId).toBe("bucket-1");
    expect(result[0]?.liquiditySourceFeedId).toBe("feed-2");
  });
});
