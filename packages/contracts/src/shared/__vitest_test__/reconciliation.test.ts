import { describe, expect, it } from "vitest";

import {
  computeTotalsFromDb,
  findDiscrepancies,
  reconciliationReport,
  reconcileTotals,
  type QueryablePool,
} from "../reconciliation";

describe("shared reconciliation", () => {
  it("reconcileTotals honors tolerance", () => {
    const expected = new Map<string, bigint>([
      ["EUR", 100n],
      ["USD", 200n],
    ]);
    const actual = new Map<string, bigint>([
      ["EUR", 101n],
      ["USD", 197n],
    ]);

    const strict = reconcileTotals(expected, actual, { toleranceMinor: 0n });
    const tolerant = reconcileTotals(expected, actual, { toleranceMinor: 3n });

    expect(strict.ok).toBe(false);
    expect(strict.totalDiscrepantCurrencies).toBe(2);
    expect(tolerant.ok).toBe(true);
    expect(tolerant.totalDiscrepantCurrencies).toBe(0);
  });

  it("findDiscrepancies returns deterministic samples", () => {
    const expected = new Map<string, { amountMinor: bigint; currencyCode: string }>([
      ["a-1", { amountMinor: 100n, currencyCode: "USD" }],
      ["a-2", { amountMinor: 300n, currencyCode: "EUR" }],
      ["a-3", { amountMinor: 50n, currencyCode: "USD" }],
    ]);

    const actual = new Map<string, { amountMinor: bigint; currencyCode: string }>([
      ["a-1", { amountMinor: 90n, currencyCode: "USD" }],
      ["a-2", { amountMinor: 300n, currencyCode: "GBP" }],
      ["a-4", { amountMinor: 10n, currencyCode: "USD" }],
    ]);

    const samples = findDiscrepancies(expected, actual, { sampleLimit: 10 });

    expect(samples).toHaveLength(4);
    expect(samples.map((s) => s.accountId)).toEqual(["a-1", "a-2", "a-3", "a-4"]);
    expect(samples[1]?.sampleContext?.note).toBe("currency mismatch");
  });

  it("reconciliationReport includes suggested actions metadata", () => {
    const expectedTotals = new Map<string, bigint>([["USD", 1000n]]);
    const actualTotals = new Map<string, bigint>([["USD", 900n]]);

    const expectedAccounts = new Map<string, { amountMinor: bigint; currencyCode: string }>([
      ["acct-1", { amountMinor: 1000n, currencyCode: "USD" }],
    ]);
    const actualAccounts = new Map<string, { amountMinor: bigint; currencyCode: string }>([
      ["acct-1", { amountMinor: 900n, currencyCode: "USD" }],
    ]);

    const report = reconciliationReport(expectedTotals, actualTotals, {
      expectedAccounts,
      actualAccounts,
      toleranceMinor: 0n,
      sampleLimit: 5,
      meta: { runId: "recon-1" },
    });

    expect(report.ok).toBe(false);
    expect(report.accountSamples).toHaveLength(1);
    expect(report.meta?.runId).toBe("recon-1");
    expect(Array.isArray(report.meta?.suggestedActions)).toBe(true);
    expect((report.meta?.suggestedActions as string[]).length).toBeGreaterThan(0);
  });

  it("computeTotalsFromDb aggregates bigint totals", async () => {
    const pool: QueryablePool = {
      async query(sql: string) {
        expect(sql).toContain("FROM account_balances");
        return {
          rows: [
            { currency: "USD", total: "12345" },
            { currency: "EUR", total: 77n },
            { currency: "JPY", total: 0 },
          ],
        };
      },
    };

    const totals = await computeTotalsFromDb(pool, "account_balances");

    expect(totals.get("USD")).toBe(12345n);
    expect(totals.get("EUR")).toBe(77n);
    expect(totals.get("JPY")).toBe(0n);
  });
});
