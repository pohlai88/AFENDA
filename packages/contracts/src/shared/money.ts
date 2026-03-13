/**
 * Canonical money representation.
 *
 * RULES:
 *   1. NO FLOATS — ever. All amounts are in the smallest indivisible unit
 *      (cents for USD/EUR, fils for BHD, etc.).
 *   2. `amountMinor` is a `bigint` — no safe-integer ceiling, audit-grade
 *      determinism for consolidations, high-volume, multi-entity, and FX reval.
 *   3. `currencyCode` is ISO 4217 three-letter UPPERCASE (USD, EUR, BHD …).
 *      The schema REJECTS lowercase — normalise before constructing Money.
 *   4. Rounding rules and FX conversion logic belong in `@afenda/core/money`,
 *      NOT in this schema. Contracts only define shape and bounds.
 *   5. Negative `amountMinor` is allowed — represents credit memos and refunds.
 *   6. JSON serialisation: `bigint` is sent as a **string** over the wire.
 *      `MoneySchema` accepts both `bigint` and numeric-string input, coercing
 *      to `bigint` via `z.coerce.bigint()`.
 */
import { z } from "zod";

/**
 * ISO 4217 three-letter uppercase currency code.
 * Strict: rejects "usd" — callers must normalise before parsing.
 */
export const CurrencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Currency code must be ISO 4217 (e.g. USD, EUR, BHD)");

export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

/**
 * Safety bound for minor-unit amounts.
 * Adjust to domain requirements if needed.
 */
export const MAX_ABSOLUTE_MINOR = BigInt("1000000000000000000"); // 1e18

const AmountMinorInput = z.preprocess((value) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isInteger(value)) return BigInt(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+$/.test(trimmed)) return BigInt(trimmed);
  }
  return value;
}, z.bigint());

export const MoneySchema = z
  .object({
    /**
     * Minor-unit amount (cents, fils, etc.) as bigint.
     * Accepts bigint directly, a numeric string, or an integer number.
     */
    amountMinor: AmountMinorInput,
    currencyCode: CurrencyCodeSchema,
  })
  .superRefine((value, ctx) => {
    const amount = value.amountMinor;
    if (amount > MAX_ABSOLUTE_MINOR || amount < -MAX_ABSOLUTE_MINOR) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `amountMinor absolute value must be <= ${MAX_ABSOLUTE_MINOR.toString()}`,
        path: ["amountMinor"],
      });
    }
  });

export type Money = z.infer<typeof MoneySchema>;

export type MoneyInput = {
  amountMinor: string | number | bigint;
  currencyCode: string;
};

/** Create validated money value from accepted input shapes. */
export function makeMoney(input: MoneyInput): Money {
  return MoneySchema.parse(input);
}

/** Runtime type guard for money payloads. */
export function isMoney(value: unknown): value is Money {
  return MoneySchema.safeParse(value).success;
}

/**
 * Format minor units to major-unit display string.
 * This helper does not perform rounding or FX conversion.
 */
export function formatMinorAsMajor(amountMinor: bigint, minorPerMajor = 100): string {
  if (!Number.isInteger(minorPerMajor) || minorPerMajor <= 0) {
    throw new Error("minorPerMajor must be a positive integer");
  }

  const sign = amountMinor < 0n ? "-" : "";
  const abs = amountMinor < 0n ? -amountMinor : amountMinor;
  const major = abs / BigInt(minorPerMajor);
  const minor = abs % BigInt(minorPerMajor);
  const minorWidth = Math.max(0, String(minorPerMajor - 1).length);
  const minorStr = String(minor).padStart(minorWidth, "0");

  return `${sign}${major}.${minorStr}`;
}

/** Serialize money into JSON-safe shape (bigint -> string). */
export function serializeMoney(money: Money): { amountMinor: string; currencyCode: CurrencyCode } {
  return {
    amountMinor: money.amountMinor.toString(),
    currencyCode: money.currencyCode,
  };
}

/** Deserialize unknown payload into validated Money. */
export function deserializeMoney(payload: unknown): Money {
  return MoneySchema.parse(payload);
}

/** JSON replacer that serializes bigint values as strings. */
export function moneyJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

export const SharedMoney = {
  CurrencyCodeSchema,
  MoneySchema,
  makeMoney,
  isMoney,
  formatMinorAsMajor,
  serializeMoney,
  deserializeMoney,
  moneyJsonReplacer,
  MAX_ABSOLUTE_MINOR,
};

export default SharedMoney;
