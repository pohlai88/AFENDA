import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  tableRefs: {
    fxRateSnapshot: {
      name: "fxRateSnapshot",
      orgId: "orgId",
      rateDate: "rateDate",
      fromCurrencyCode: "fromCurrencyCode",
      toCurrencyCode: "toCurrencyCode",
      sourceVersion: "sourceVersion",
      createdAt: "createdAt",
    },
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

import { listFxRateSnapshots } from "../fx-rate-snapshot.queries";

function createDb(rows: unknown[]) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(async () => rows),
        })),
      })),
    })),
  };
}

describe("fx-rate-snapshot queries", () => {
  it("lists FX snapshots for an org with applied filters", async () => {
    const rows = [
      {
        id: "fx-1",
        orgId: "org-1",
        rateDate: "2026-03-12",
        fromCurrencyCode: "EUR",
        toCurrencyCode: "USD",
        rateScaled: "1100000",
        scale: 6,
        providerCode: "ECB",
        sourceVersion: "v1",
        createdAt: new Date("2026-03-12T00:00:00.000Z"),
      },
    ];
    const db = createDb(rows);

    const result = await listFxRateSnapshots(db as never, "org-1" as never, {
      rateDate: "2026-03-12",
      fromCurrencyCode: "EUR",
      toCurrencyCode: "USD",
      sourceVersion: "v1",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("fx-1");
    expect(result[0]?.fromCurrencyCode).toBe("EUR");
  });
});
