/**
 * Money kernel — audit-grade, float-free money arithmetic.
 *
 * Rule: No floats. Ever.
 * All amounts are bigint minor units (cents, pips) — no safe-integer ceiling.
 * ISO 4217 currency codes use the branded `CurrencyCode` type from contracts.
 *
 * Domain truth uses `bigint`. JSON/API boundaries serialise as string.
 * DB columns use `numeric` (or `bigint` where safe).
 *
 * `Money` and `CurrencyCode` are imported from `@afenda/contracts` — the
 * single source of truth for shapes. All arithmetic, deterministic conversion,
 * and allocation logic live here.
 * Locale-aware formatting lives in `@afenda/ui/money` — NOT here.
 */

import type { Money, CurrencyCode } from "@afenda/contracts";

export type { Money, CurrencyCode };

// ── ISO 4217 minor-unit exponents ─────────────────────────────────────────────
// Default exponent is 2 (USD, EUR, GBP, …). Override only when ≠ 2.
// Pinned dataset — ISO 4217:2015 + amendment 172 (2024-06).
// TODO: add CI script to regenerate from ISO 4217 XML feed.

const MINOR_EXPONENTS: Readonly<Partial<Record<CurrencyCode, number>>> = {
  // 0-decimal currencies
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  // 1-decimal currencies (rare)
  MGA: 1,
  MRU: 1,
  // 3-decimal currencies
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
} as Record<string, number>;

/**
 * Minor-unit exponent for a currency.
 * Returns 2 for most currencies, 3 for BHD/KWD/etc., 0 for JPY/KRW/etc.
 */
export function minorExponent(currencyCode: CurrencyCode): number {
  return (MINOR_EXPONENTS as Record<string, number>)[currencyCode] ?? 2;
}

/**
 * Minor-unit factor for a currency (10^exponent) as bigint.
 * Returns 100n for most currencies, 1000n for BHD/KWD/etc., 1n for JPY/KRW/etc.
 */
export function minorFactor(currencyCode: CurrencyCode): bigint {
  return 10n ** BigInt(minorExponent(currencyCode));
}

// ── Constructors ──────────────────────────────────────────────────────────────

/**
 * Construct Money directly from minor units (preferred in domain code).
 * This is the canonical constructor — zero conversion, zero risk.
 */
export function fromMinorUnits(amountMinor: bigint, currencyCode: CurrencyCode): Money {
  return { amountMinor, currencyCode };
}

/**
 * Construct Money from whole major units only (e.g. 12 USD → 1200 cents).
 * No floats — accepts bigint only. For fractional amounts use fromMajorDecimalString.
 */
export function fromMajorUnitsInt(major: bigint, currencyCode: CurrencyCode): Money {
  return { amountMinor: major * minorFactor(currencyCode), currencyCode };
}

/**
 * Parse a decimal string (e.g. "123.45") into Money.
 * Strict: no locale separators, no currency symbols, no whitespace, no `+` sign.
 *
 * @throws On invalid format or sub-minor-unit precision.
 */
export function fromMajorDecimalString(s: string, currencyCode: CurrencyCode): Money {
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    throw new Error(`fromMajorDecimalString: invalid decimal string "${s}"`);
  }

  const exp = minorExponent(currencyCode);
  const negative = s.startsWith("-");
  const body = negative ? s.slice(1) : s;

  const dotIdx = body.indexOf(".");
  const intPart = dotIdx === -1 ? body : body.slice(0, dotIdx);
  const fracPartRaw = dotIdx === -1 ? "" : body.slice(dotIdx + 1);

  if (fracPartRaw.length > exp) {
    throw new Error(
      `fromMajorDecimalString: "${s}" has more decimal places than ` +
        `${currencyCode} allows (max ${exp})`,
    );
  }

  const fracPart = fracPartRaw.padEnd(exp, "0");
  const digits = intPart + fracPart;
  const amountMinor = BigInt(digits || "0");
  return { amountMinor: negative ? -amountMinor : amountMinor, currencyCode };
}

// ── Arithmetic ────────────────────────────────────────────────────────────────

/** Add two Money values. Throws on currency mismatch. */
export function addMoney(a: Money, b: Money): Money {
  assertCurrencyMatch(a, b, "addMoney");
  return { amountMinor: a.amountMinor + b.amountMinor, currencyCode: a.currencyCode };
}

/** Subtract b from a. Throws on currency mismatch. */
export function subtractMoney(a: Money, b: Money): Money {
  assertCurrencyMatch(a, b, "subtractMoney");
  return { amountMinor: a.amountMinor - b.amountMinor, currencyCode: a.currencyCode };
}

/** Negate (flip sign) — useful for credit memos and refunds. */
export function negateMoney(m: Money): Money {
  return { amountMinor: -m.amountMinor, currencyCode: m.currencyCode };
}

/** Absolute value. */
export function absMoney(m: Money): Money {
  return {
    amountMinor: m.amountMinor < 0n ? -m.amountMinor : m.amountMinor,
    currencyCode: m.currencyCode,
  };
}

/** True when amount is exactly zero. */
export function isZero(m: Money): boolean {
  return m.amountMinor === 0n;
}

/**
 * Compare two Money values. Throws on currency mismatch.
 * Returns -1 | 0 | 1 (like `Array.sort` comparator).
 */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertCurrencyMatch(a, b, "compareMoney");
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

/**
 * Multiply by an integer quantity. No floats.
 * Use case: line qty × unit price, tax lot calculations.
 */
export function multiplyByInt(m: Money, qty: bigint): Money {
  return { amountMinor: m.amountMinor * qty, currencyCode: m.currencyCode };
}

/**
 * Deterministic pro-rata allocation with largest-remainder rounding.
 *
 * Splits `total` across `weights` proportionally, ensuring the sum of
 * allocations **exactly** equals `total` — no penny lost, no penny created.
 * Critical for AP/AR tax splits, discount allocation, and cost distribution.
 *
 * @param total - The amount to allocate.
 * @param weights - Non-negative bigint weights (at least one must be > 0).
 * @returns Array of Money values, one per weight, in the same order.
 * @throws If weights are empty or all zero.
 */
export function allocateProRata(total: Money, weights: readonly bigint[]): Money[] {
  if (weights.length === 0) {
    throw new Error("allocateProRata: weights must not be empty");
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0n);
  if (totalWeight === 0n) {
    throw new Error("allocateProRata: total weight must be > 0");
  }

  const amount = total.amountMinor;
  const sign = amount < 0n ? -1n : 1n;
  const absAmount = amount < 0n ? -amount : amount;

  // Floor allocations
  const floors: bigint[] = weights.map((w) => (absAmount * w) / totalWeight);

  // Remainder to distribute
  const floorSum = floors.reduce((s, f) => s + f, 0n);
  let remainder = absAmount - floorSum;

  // Largest-remainder method: sort indices by fractional part descending,
  // distribute one unit each until remainder is exhausted.
  // Fractional part = (absAmount * w) % totalWeight (higher = bigger fraction)
  const fractionals = weights.map((w) => (absAmount * w) % totalWeight);

  const indices = Array.from({ length: weights.length }, (_, i) => i);
  indices.sort((a, b) => {
    const diff = fractionals[b]! - fractionals[a]!;
    // Stable tiebreak by index for determinism
    return diff > 0n ? 1 : diff < 0n ? -1 : a - b;
  });

  for (const idx of indices) {
    if (remainder <= 0n) break;
    floors[idx]! += 1n;
    remainder -= 1n;
  }

  return floors.map((f) => ({
    amountMinor: sign * f,
    currencyCode: total.currencyCode,
  }));
}

// ── Deterministic conversion (no locale) ──────────────────────────────────────

/**
 * Convert Money to a deterministic fixed-scale decimal string (e.g. "123.45").
 * Always prints exactly `exp` decimal places for determinism.
 * No locale, no currency symbol — for storage, logging, and API responses.
 * Locale-aware display formatting lives in `@afenda/ui/money`.
 */
export function toMajorDecimalString(m: Money): string {
  const exp = minorExponent(m.currencyCode);
  if (exp === 0) return m.amountMinor.toString();

  const abs = m.amountMinor < 0n ? -m.amountMinor : m.amountMinor;
  const sign = m.amountMinor < 0n ? "-" : "";
  const str = abs.toString().padStart(exp + 1, "0");
  const intPart = str.slice(0, str.length - exp);
  const fracPart = str.slice(str.length - exp);
  return `${sign}${intPart}.${fracPart}`;
}

// ── Invariant guards ─────────────────────────────────────────────────────────

/**
 * Assert that a Money value is non-negative.
 * Use for domain invariants (e.g. invoice total, payment amount).
 * @throws If amount is negative.
 */
export function assertNonNegative(m: Money, label?: string): void {
  if (m.amountMinor < 0n) {
    const ctx = label ? ` (${label})` : "";
    throw new Error(
      `assertNonNegative${ctx}: expected non-negative amount, got ${toMajorDecimalString(m)} ${m.currencyCode}`,
    );
  }
}

function assertCurrencyMatch(a: Money, b: Money, op: string): void {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`${op}: currency mismatch ${a.currencyCode} vs ${b.currencyCode}`);
  }
}
