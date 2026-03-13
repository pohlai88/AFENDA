/**
 * src/shared/money-utils.ts
 *
 * Deterministic, pure helpers for money arithmetic.
 *
 * RULES:
 *  - No FX, no rounding policy decisions beyond deterministic integer rounding.
 *  - All arithmetic is performed on `amountMinor: bigint`.
 *  - Functions throw on currency mismatch.
 *  - Provide a safe rational scaler (numerator/denominator) to avoid floats.
 */

import { type Money, MoneySchema, formatMinorAsMajor, makeMoney } from "./money.js";
import { minorPerMajorFor } from "./currency.js";

function assertMoneyShape(value: unknown): asserts value is Money {
  const parsed = MoneySchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid Money shape: ${parsed.error.message}`);
  }
}

function ensureSameCurrency(a: Money, b: Money): void {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`Currency mismatch: ${a.currencyCode} !== ${b.currencyCode}`);
  }
}

/**
 * Deterministic integer division with rounding to nearest integer.
 * Rounds half away from zero.
 */
function divRound(n: bigint, d: bigint): bigint {
  if (d === 0n) {
    throw new Error("division by zero");
  }

  const sign = n < 0n ? -1n : 1n;
  const absN = n < 0n ? -n : n;
  const absD = d < 0n ? -d : d;
  const half = absD / 2n;
  const rounded = (absN + half) / absD;
  return sign * rounded;
}

/** Add two Money values. Throws on currency mismatch. */
export function addMoney(a: Money, b: Money): Money {
  assertMoneyShape(a);
  assertMoneyShape(b);
  ensureSameCurrency(a, b);
  return makeMoney({
    amountMinor: a.amountMinor + b.amountMinor,
    currencyCode: a.currencyCode,
  });
}

/** Subtract b from a (a - b). Throws on currency mismatch. */
export function subtractMoney(a: Money, b: Money): Money {
  assertMoneyShape(a);
  assertMoneyShape(b);
  ensureSameCurrency(a, b);
  return makeMoney({
    amountMinor: a.amountMinor - b.amountMinor,
    currencyCode: a.currencyCode,
  });
}

/**
 * Sum an array of Money values in the same currency.
 * Throws on empty arrays and currency mismatch.
 */
export function sumMoney(items: Money[]): Money {
  if (!Array.isArray(items)) {
    throw new Error("sumMoney expects an array");
  }
  if (items.length === 0) {
    throw new Error(
      "sumMoney requires at least one Money item; use sumByCurrency for empty/heterogeneous sets",
    );
  }

  const first = items[0];
  if (!first) {
    throw new Error(
      "sumMoney requires at least one Money item; use sumByCurrency for empty/heterogeneous sets",
    );
  }

  assertMoneyShape(first);
  let total = 0n;
  for (const item of items) {
    assertMoneyShape(item);
    if (item.currencyCode !== first.currencyCode) {
      throw new Error(
        `Currency mismatch in sumMoney: expected ${first.currencyCode}, got ${item.currencyCode}`,
      );
    }
    total += item.amountMinor;
  }

  return makeMoney({
    amountMinor: total,
    currencyCode: first.currencyCode,
  });
}

/** Compare two Money values. Throws on currency mismatch. */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertMoneyShape(a);
  assertMoneyShape(b);
  ensureSameCurrency(a, b);
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

/**
 * Scale a Money value by a rational factor numerator/denominator.
 * Deterministic rounding: half away from zero.
 */
export function scaleMoneyByRatio(m: Money, numerator: bigint, denominator: bigint): Money {
  assertMoneyShape(m);
  if (denominator === 0n) {
    throw new Error("scaleMoneyByRatio: denominator must not be zero");
  }

  const product = m.amountMinor * numerator;
  const scaled = divRound(product, denominator);
  return makeMoney({ amountMinor: scaled, currencyCode: m.currencyCode });
}

/** Convenience: scale by integer multiplier (positive or negative). */
export function scaleMoneyByInt(m: Money, multiplier: bigint): Money {
  assertMoneyShape(m);
  return makeMoney({ amountMinor: m.amountMinor * multiplier, currencyCode: m.currencyCode });
}

/**
 * Sum an array of Money values grouped by currency.
 * Returns a Map from currencyCode -> Money (sum).
 */
export function sumByCurrency(items: Money[]): Map<string, Money> {
  const totals = new Map<string, bigint>();
  for (const item of items) {
    assertMoneyShape(item);
    const previous = totals.get(item.currencyCode) ?? 0n;
    totals.set(item.currencyCode, previous + item.amountMinor);
  }

  const result = new Map<string, Money>();
  for (const [currencyCode, amountMinor] of totals.entries()) {
    result.set(currencyCode, makeMoney({ amountMinor, currencyCode }));
  }
  return result;
}

/** Formatting helper that prefixes currency code. */
export function formatMoney(value: Money, minorPerMajor?: number): string {
  const resolvedMinorPerMajor = minorPerMajor ?? minorPerMajorFor(value.currencyCode);
  return `${value.currencyCode} ${formatMinorAsMajor(value.amountMinor, resolvedMinorPerMajor)}`;
}

/** Runtime assertion guard when callers hold unknown input. */
export function assertMoneyValue(value: unknown, label = "value"): asserts value is Money {
  try {
    assertMoneyShape(value);
  } catch {
    throw new Error(`${label} must be a valid Money value`);
  }
}

/** Legacy alias retained for compatibility. */
export function multiplyMoneyByInt(value: Money, factor: bigint | number): Money {
  const normalizedFactor = typeof factor === "bigint" ? factor : BigInt(Math.trunc(factor));
  return scaleMoneyByInt(value, normalizedFactor);
}

/** Legacy unary negation helper retained for compatibility. */
export function negateMoney(value: Money): Money {
  return scaleMoneyByInt(value, -1n);
}

/** Legacy absolute-value helper retained for compatibility. */
export function absMoney(value: Money): Money {
  assertMoneyShape(value);
  const amountMinor = value.amountMinor < 0n ? -value.amountMinor : value.amountMinor;
  return makeMoney({ amountMinor, currencyCode: value.currencyCode });
}

export const MoneyUtils = {
  addMoney,
  subtractMoney,
  sumMoney,
  compareMoney,
  scaleMoneyByRatio,
  scaleMoneyByInt,
  sumByCurrency,

  // Legacy exports retained for compatibility.
  multiplyMoneyByInt,
  negateMoney,
  absMoney,
  formatMoney,
  assertMoneyValue,
};

export const SharedMoneyUtils = MoneyUtils;

export default MoneyUtils;
