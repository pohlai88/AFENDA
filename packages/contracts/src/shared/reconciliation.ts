import { z } from "zod";

const SqlIdentifierSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/u, "invalid SQL identifier");

function parseIdentifier(value: string, label: string): string {
  try {
    return SqlIdentifierSchema.parse(value);
  } catch {
    throw new Error(`${label} must be a valid SQL identifier`);
  }
}

function absBigInt(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function parseBigIntLike(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("numeric value is not finite");
    }
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? 0n : BigInt(trimmed);
  }
  if (value == null) return 0n;
  throw new Error(`unsupported numeric value type: ${typeof value}`);
}

export type Currency = string;
export type AmountMinor = bigint;

export type TotalsMap = Map<Currency, AmountMinor>;

export type CurrencyDiff = {
  currency: Currency;
  expected: AmountMinor;
  actual: AmountMinor;
  diff: AmountMinor;
};

export type AccountDiffSample = {
  accountId: string;
  currency: Currency;
  expectedMinor: AmountMinor;
  actualMinor: AmountMinor;
  diff: AmountMinor;
  sampleContext?: Record<string, unknown>;
};

export type ReconciliationResult = {
  ok: boolean;
  totalCurrenciesCompared: number;
  totalDiscrepantCurrencies: number;
  currencyDiffs: CurrencyDiff[];
  accountSamples: AccountDiffSample[];
  meta?: Record<string, unknown>;
};

export type AccountBalanceSnapshot = {
  amountMinor: bigint;
  currencyCode: string;
  sampleContext?: Record<string, unknown>;
};

export type QueryablePool = {
  query: (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;
};

export function reconcileTotals(
  expected: TotalsMap,
  actual: TotalsMap,
  opts?: { toleranceMinor?: bigint },
): ReconciliationResult {
  const tolerance = opts?.toleranceMinor ?? 0n;
  if (tolerance < 0n) {
    throw new Error("toleranceMinor must be >= 0");
  }

  const currencies = Array.from(new Set<string>([...expected.keys(), ...actual.keys()])).sort();
  const currencyDiffs: CurrencyDiff[] = [];

  for (const currency of currencies) {
    const expectedMinor = expected.get(currency) ?? 0n;
    const actualMinor = actual.get(currency) ?? 0n;
    const diff = actualMinor - expectedMinor;

    if (absBigInt(diff) > tolerance) {
      currencyDiffs.push({
        currency,
        expected: expectedMinor,
        actual: actualMinor,
        diff,
      });
    }
  }

  return {
    ok: currencyDiffs.length === 0,
    totalCurrenciesCompared: currencies.length,
    totalDiscrepantCurrencies: currencyDiffs.length,
    currencyDiffs,
    accountSamples: [],
  };
}

export function findDiscrepancies(
  expectedAccounts: Map<string, AccountBalanceSnapshot>,
  actualAccounts: Map<string, AccountBalanceSnapshot>,
  opts?: { sampleLimit?: number; toleranceMinor?: bigint },
): AccountDiffSample[] {
  const sampleLimit = opts?.sampleLimit ?? 50;
  const tolerance = opts?.toleranceMinor ?? 0n;

  if (sampleLimit <= 0) return [];
  if (tolerance < 0n) {
    throw new Error("toleranceMinor must be >= 0");
  }

  const samples: AccountDiffSample[] = [];
  const accountIds = Array.from(
    new Set<string>([...expectedAccounts.keys(), ...actualAccounts.keys()]),
  ).sort();

  for (const accountId of accountIds) {
    if (samples.length >= sampleLimit) break;

    const expected = expectedAccounts.get(accountId);
    const actual = actualAccounts.get(accountId);

    if (!expected && actual) {
      samples.push({
        accountId,
        currency: actual.currencyCode,
        expectedMinor: 0n,
        actualMinor: actual.amountMinor,
        diff: actual.amountMinor,
        sampleContext: actual.sampleContext,
      });
      continue;
    }

    if (expected && !actual) {
      samples.push({
        accountId,
        currency: expected.currencyCode,
        expectedMinor: expected.amountMinor,
        actualMinor: 0n,
        diff: 0n - expected.amountMinor,
        sampleContext: expected.sampleContext,
      });
      continue;
    }

    if (!expected || !actual) continue;

    if (expected.currencyCode !== actual.currencyCode) {
      samples.push({
        accountId,
        currency: expected.currencyCode,
        expectedMinor: expected.amountMinor,
        actualMinor: actual.amountMinor,
        diff: actual.amountMinor - expected.amountMinor,
        sampleContext: {
          note: "currency mismatch",
          actualCurrency: actual.currencyCode,
          expectedContext: expected.sampleContext,
          actualContext: actual.sampleContext,
        },
      });
      continue;
    }

    const diff = actual.amountMinor - expected.amountMinor;
    if (absBigInt(diff) > tolerance) {
      samples.push({
        accountId,
        currency: expected.currencyCode,
        expectedMinor: expected.amountMinor,
        actualMinor: actual.amountMinor,
        diff,
        sampleContext:
          expected.sampleContext || actual.sampleContext
            ? {
                expectedContext: expected.sampleContext,
                actualContext: actual.sampleContext,
              }
            : undefined,
      });
    }
  }

  return samples;
}

export function reconciliationReport(
  expectedTotals: TotalsMap,
  actualTotals: TotalsMap,
  opts?: {
    expectedAccounts?: Map<string, AccountBalanceSnapshot>;
    actualAccounts?: Map<string, AccountBalanceSnapshot>;
    toleranceMinor?: bigint;
    sampleLimit?: number;
    meta?: Record<string, unknown>;
  },
): ReconciliationResult {
  const totalsResult = reconcileTotals(expectedTotals, actualTotals, {
    toleranceMinor: opts?.toleranceMinor,
  });

  const accountSamples =
    opts?.expectedAccounts && opts?.actualAccounts
      ? findDiscrepancies(opts.expectedAccounts, opts.actualAccounts, {
          sampleLimit: opts.sampleLimit,
          toleranceMinor: opts.toleranceMinor,
        })
      : [];

  const suggestedActions: string[] = [];
  if (!totalsResult.ok) {
    suggestedActions.push(
      "Validate currency minor-unit policy and rounding behavior for discrepant currencies.",
    );
  }
  if (accountSamples.length > 0) {
    suggestedActions.push(
      "Investigate sampled account diffs and verify conversion/backfill logic for affected rows.",
    );
  }

  return {
    ...totalsResult,
    accountSamples,
    meta: {
      ...(opts?.meta ?? {}),
      toleranceMinor: opts?.toleranceMinor ?? 0n,
      sampleLimit: opts?.sampleLimit ?? 50,
      suggestedActions,
    },
  };
}

export async function computeTotalsFromDb(
  pool: QueryablePool,
  table: string,
  amountCol = "amount_minor",
  currencyCol = "currency_code",
): Promise<TotalsMap> {
  const safeTable = parseIdentifier(table, "table");
  const safeAmountCol = parseIdentifier(amountCol, "amountCol");
  const safeCurrencyCol = parseIdentifier(currencyCol, "currencyCol");

  const sql = `
    SELECT ${safeCurrencyCol} AS currency, SUM(${safeAmountCol}) AS total
    FROM ${safeTable}
    GROUP BY ${safeCurrencyCol}
  `;

  const res = await pool.query(sql);
  const totals = new Map<string, bigint>();

  for (const row of res.rows) {
    const currency = String(row.currency ?? "").trim();
    if (currency.length === 0) continue;
    totals.set(currency, parseBigIntLike(row.total));
  }

  return totals;
}

export const Reconciliation = {
  reconcileTotals,
  findDiscrepancies,
  reconciliationReport,
  computeTotalsFromDb,
};

export default Reconciliation;
