import { describe, expect, it } from "vitest";

import {
  createSeededRng,
  deterministicUuid,
  makeDateFixture,
  makeJournalEntryFixture,
  makeMoneyFixture,
  randomMoney,
  randomUtcDate,
  runPropertyHarness,
  sampleLedgerBatch,
  seedGenerator,
} from "../test-fixtures";

describe("shared test-fixtures", () => {
  it("creates deterministic UUIDs for the same seed", () => {
    const a = createSeededRng("seed-1");
    const b = createSeededRng("seed-1");

    const uuidA = deterministicUuid(a);
    const uuidB = deterministicUuid(b);

    expect(uuidA).toBe(uuidB);
    expect(uuidA).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("makes deterministic money fixtures", () => {
    const m1 = makeMoneyFixture({ rng: createSeededRng("money-seed") });
    const m2 = makeMoneyFixture({ rng: createSeededRng("money-seed") });

    expect(m1).toEqual(m2);
    expect(typeof m1.amountMinor).toBe("bigint");
  });

  it("makes deterministic date fixtures", () => {
    const d1 = makeDateFixture({ rng: createSeededRng("date-seed"), maxOffsetDays: 60 });
    const d2 = makeDateFixture({ rng: createSeededRng("date-seed"), maxOffsetDays: 60 });

    expect(d1).toBe(d2);
    expect(d1.endsWith("Z")).toBe(true);
  });

  it("enforces journal debit/credit invariants", () => {
    expect(() =>
      makeJournalEntryFixture({
        debitMinor: 10n,
        creditMinor: 10n,
      }),
    ).toThrow("exactly one of debitMinor or creditMinor must be > 0");

    const entry = makeJournalEntryFixture({ rng: createSeededRng("journal-seed") });
    expect(entry.debitMinor > 0n || entry.creditMinor > 0n).toBe(true);
    expect(entry.debitMinor > 0n && entry.creditMinor > 0n).toBe(false);
  });

  it("returns stable seed output for currencies and permissions", () => {
    const s1 = seedGenerator({ seed: "seed-x" });
    const s2 = seedGenerator({ seed: "seed-x" });

    expect(s1).toEqual(s2);
    expect(s1.currencyMeta.length).toBeGreaterThan(0);
  });

  it("builds deterministic ledger batches", () => {
    const b1 = sampleLedgerBatch("batch-seed", 5);
    const b2 = sampleLedgerBatch("batch-seed", 5);

    expect(b1).toEqual(b2);
    expect(b1).toHaveLength(5);
  });

  it("generates bounded random money", () => {
    const value = randomMoney({ min: 100n, max: 150n, seed: "money-range" }, "USD");
    expect(value.amountMinor >= 100n && value.amountMinor <= 150n).toBe(true);
    expect(value.currencyCode).toBe("USD");
  });

  it("generates UTC datetime inside range", () => {
    const date = randomUtcDate({
      fromIso: "2026-01-01T00:00:00.000Z",
      toIso: "2026-01-02T00:00:00.000Z",
      seed: "date-range",
    });

    expect(date.endsWith("Z")).toBe(true);
    expect(new Date(date).getTime()).toBeGreaterThanOrEqual(
      new Date("2026-01-01T00:00:00.000Z").getTime(),
    );
    expect(new Date(date).getTime()).toBeLessThanOrEqual(
      new Date("2026-01-02T00:00:00.000Z").getTime(),
    );
  });

  it("runs property harness for all iterations", async () => {
    const seen: number[] = [];
    await runPropertyHarness({
      iterations: 5,
      sample: () => seen.length,
      property: async (value) => {
        seen.push(value);
      },
    });

    expect(seen).toEqual([0, 1, 2, 3, 4]);
  });
});
