/**
 * Money display formatting — locale-aware presentation layer.
 *
 * This is the ONLY place locale-aware money formatting lives.
 * Domain truth (arithmetic, invariants, conversion) stays in `@afenda/core/finance`.
 *
 * RULES:
 *   1. Functions here are for display only — never for storage, comparison,
 *      or domain logic.
 *   2. All inputs are the `Money` type from `@afenda/contracts`.
 *   3. No side effects, no DB, no HTTP.
 */

import type { Money } from "@afenda/contracts";

/**
 * Minor-unit exponent for a currency (same map as core/finance — kept in sync).
 * Only used for display division — no domain logic here.
 */
const MINOR_EXPONENTS: Readonly<Record<string, number>> = {
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0,
  PYG: 0, RWF: 0, UGX: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  MGA: 1, MRU: 1,
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
};

function minorExponent(currencyCode: string): number {
  return MINOR_EXPONENTS[currencyCode] ?? 2;
}

/**
 * Format Money for locale-aware display.
 *
 * NOT for storage or comparison — use `toMajorDecimalString()` from
 * `@afenda/core` for deterministic string output.
 */
export function formatMoney(m: Money, locale = "en-US"): string {
  const exp = minorExponent(m.currencyCode);
  const factor = 10 ** exp;
  const major = Number(m.amountMinor) / factor;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currencyCode,
  }).format(major);
}
