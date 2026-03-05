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

export const MoneySchema = z.object({
  /**
   * Minor-unit amount (cents, fils, etc.) as bigint.
   * Accepts bigint directly or a numeric string (e.g. "12345") for JSON input.
   */
  amountMinor: z.coerce.bigint(),
  currencyCode: CurrencyCodeSchema,
});

export type Money = z.infer<typeof MoneySchema>;
