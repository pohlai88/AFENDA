import { describe, expect, it, vi } from "vitest";

vi.mock("@afenda/db", () => ({
  fxRateSnapshot: {
    id: "id",
    orgId: "orgId",
    rateDate: "rateDate",
    fromCurrencyCode: "fromCurrencyCode",
    toCurrencyCode: "toCurrencyCode",
    sourceVersion: "sourceVersion",
    rateScaled: "rateScaled",
    scale: "scale",
  },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    and: vi.fn((..._args: unknown[]) => ({ __op: "and" })),
    eq: vi.fn((_a: unknown, _b: unknown) => ({ __op: "eq" })),
  };
});

import { normalizeMinorByScaledRate } from "../calculators/fx-normalization";
import { normalizeToBase } from "../fx-normalization.service";

function createDb(selectRows: unknown[]) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => selectRows),
      })),
    })),
  };
}

describe("fx normalization", () => {
  it("normalizes by scaled rate deterministically", () => {
    expect(
      normalizeMinorByScaledRate({
        amountMinor: "10000",
        rateScaled: "1250000",
        scale: 6,
      }),
    ).toBe("12500");
  });

  it("returns passthrough for same-currency normalization", async () => {
    const result = await normalizeToBase(createDb([]) as never, {
      orgId: "org-1" as never,
      rateDate: "2026-03-12",
      fromCurrencyCode: "USD",
      toCurrencyCode: "USD",
      amountMinor: "500",
      sourceVersion: "v1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.normalizedMinor).toBe("500");
      expect(result.data.fxRateSnapshotId).toBeNull();
    }
  });

  it("returns not-found when FX rate snapshot is absent", async () => {
    const result = await normalizeToBase(createDb([]) as never, {
      orgId: "org-1" as never,
      rateDate: "2026-03-12",
      fromCurrencyCode: "EUR",
      toCurrencyCode: "USD",
      amountMinor: "1000",
      sourceVersion: "v1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND");
    }
  });

  it("returns normalized amount and snapshot id when rate exists", async () => {
    const result = await normalizeToBase(
      createDb([{ id: "fx-1", rateScaled: "1100000", scale: 6 }]) as never,
      {
        orgId: "org-1" as never,
        rateDate: "2026-03-12",
        fromCurrencyCode: "EUR",
        toCurrencyCode: "USD",
        amountMinor: "1000",
        sourceVersion: "v1",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.normalizedMinor).toBe("1100");
      expect(result.data.fxRateSnapshotId).toBe("fx-1");
    }
  });
});
