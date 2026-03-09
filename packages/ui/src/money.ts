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
 *   4. Never perform money math using floating-point as the source of truth.
 */

import type { Money } from "@afenda/contracts";

/**
 * Minor-unit exponent for a currency.
 *
 * NOTE:
 *   This MUST be kept aligned with the upstream finance truth source.
 *   Preferred long-term design:
 *   move currency metadata to a shared source-of-truth package or codegen step.
 */
const MINOR_EXPONENTS: Readonly<Record<string, number>> = {
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
  MGA: 1,
  MRU: 1,
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
};

/**
 * Get minor-unit exponent for a currency (ISO 4217).
 * Used for parsing and formatting major-unit strings.
 */
export function getCurrencyExponent(currencyCode: string): number {
  return MINOR_EXPONENTS[currencyCode] ?? 2;
}

function minorExponent(currencyCode: string): number {
  return getCurrencyExponent(currencyCode);
}

interface MajorParts {
  negative: boolean;
  integer: string;
  fraction: string;
  exponent: number;
}

/**
 * Convert minor units to exact decimal parts using bigint math only.
 *
 * This is safe for very large balances and never relies on floating-point
 * for the truth representation.
 */
function toMajorParts(amountMinor: bigint, exponent: number): MajorParts {
  const negative = amountMinor < 0n;
  const abs = negative ? -amountMinor : amountMinor;

  if (exponent === 0) {
    return {
      negative,
      integer: abs.toString(),
      fraction: "",
      exponent,
    };
  }

  const divisor = 10n ** BigInt(exponent);
  const integerPart = abs / divisor;
  const fractionPart = abs % divisor;

  return {
    negative,
    integer: integerPart.toString(),
    fraction: fractionPart.toString().padStart(exponent, "0"),
    exponent,
  };
}

/**
 * Exact major-unit decimal string, e.g.:
 *   12345 minor @ exp 2 -> "123.45"
 *   -500 minor @ exp 0 -> "-500"
 */
function toMajorDecimalString(parts: MajorParts): string {
  const sign = parts.negative ? "-" : "";

  if (parts.exponent === 0) {
    return `${sign}${parts.integer}`;
  }

  return `${sign}${parts.integer}.${parts.fraction}`;
}

/**
 * Fallback display when Intl formatting is unavailable or unsafe.
 *
 * Example:
 *   USD 123.45
 *   -JPY 500
 */
function formatMoneyFallback(currencyCode: string, parts: MajorParts): string {
  const value =
    parts.exponent === 0
      ? parts.integer
      : `${parts.integer}.${parts.fraction}`;

  return `${parts.negative ? "-" : ""}${currencyCode} ${value}`;
}

/**
 * Try locale-aware formatting through Intl.
 *
 * IMPORTANT:
 *   Intl.NumberFormat currently formats numbers, so this path is only used
 *   when conversion to JS number is safe enough. Otherwise we fall back to an
 *   exact string representation.
 */
function tryIntlCurrencyFormat(
  currencyCode: string,
  locale: string,
  parts: MajorParts,
): string | null {
  const decimalString = toMajorDecimalString(parts);
  const asNumber = Number(decimalString);

  if (!Number.isFinite(asNumber)) {
    return null;
  }

  /**
   * Guard against precision loss in the integer portion.
   * Once integer digits exceed safe integer precision, Number-based formatting
   * can become visually incorrect.
   */
  const integerDigits = parts.integer.replace(/^0+/, "").length || 1;
  if (integerDigits > 15) {
    return null;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: parts.exponent,
      maximumFractionDigits: parts.exponent,
    }).format(asNumber);
  } catch {
    return null;
  }
}

/**
 * Format Money for locale-aware display.
 *
 * NOT for storage or comparison — use deterministic decimal-string helpers
 * in domain/core for business logic and persistence.
 */
export function formatMoney(m: Money, locale = "en-US"): string {
  const exponent = minorExponent(m.currencyCode);
  const parts = toMajorParts(BigInt(m.amountMinor), exponent);

  const intlFormatted = tryIntlCurrencyFormat(m.currencyCode, locale, parts);
  if (intlFormatted) {
    return intlFormatted;
  }

  return formatMoneyFallback(m.currencyCode, parts);
}

/**
 * Convert bigint minor units to exact major-unit decimal string.
 * Used for input display (e.g. 1234n + USD → "12.34").
 * Safe for large values — no Number() conversion.
 */
export function minorToMajorDecimalString(amountMinor: bigint, currencyCode: string): string {
  const exponent = getCurrencyExponent(currencyCode);
  const negative = amountMinor < 0n;
  const absolute = negative ? -amountMinor : amountMinor;
  const raw = absolute.toString().padStart(exponent + 1, "0");

  if (exponent === 0) {
    return `${negative ? "-" : ""}${raw}`;
  }

  const whole = raw.slice(0, -exponent) || "0";
  const fraction = raw.slice(-exponent);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/**
 * Parse major-unit decimal string to bigint minor units.
 * Returns null for empty or invalid input.
 * Never throws — use for user input parsing.
 */
export function parseMajorToMinor(value: string, currencyCode: string): bigint | null {
  const exponent = getCurrencyExponent(currencyCode);
  const trimmed = value.trim().replace(/,/g, "");

  if (trimmed === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const parts = unsigned.split(".");
  const wholePart = parts[0] ?? "0";
  const fractionPart = parts[1] ?? "";

  if (fractionPart.length > exponent) return null;

  const paddedFraction = fractionPart.padEnd(exponent, "0");
  const minorString = (exponent === 0 ? wholePart : `${wholePart}${paddedFraction}`).replace(
    /^0+(?=\d)/,
    "",
  );
  const minor = BigInt(minorString || "0");
  return negative ? -minor : minor;
}
