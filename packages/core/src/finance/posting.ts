/**
 * Posting invariants.
 *
 * Rules:
 *   1. Every journal entry must balance (Σ debits == Σ credits), per currency.
 *   2. Each line must carry a debit OR a credit — never both, never neither
 *      (XOR invariant). This catches double-sided lines before any DB write.
 *   3. Multi-currency: balanced per currency; cross-currency entries require
 *      explicit FX conversion lines — no implicit conversion.
 *   4. Every line must have a non-empty accountId.
 *
 * This check runs BEFORE writing to DB.
 * All posting DB operations must use db.transaction() — enforced here by design.
 *
 * Note: amounts use `bigint` (minor units) — no safe-integer ceiling.
 *
 * TODO(sprint-1): Add `lineType` / `fxRateId` field to JournalLineInput so
 *   `validateFxEvidence(lines)` can enforce explicit FX lines when multiple
 *   currencies appear in a single entry.
 */

import type { CurrencyCode } from "@afenda/contracts";

export type JournalLineInput = {
  accountId: string;
  debitMinor: bigint;
  creditMinor: bigint;
  currencyCode: CurrencyCode;
};

/** Stable, contract-safe validation failure codes. */
export type PostingValidationCode =
  | "EMPTY"
  | "MISSING_ACCOUNT"
  | "NEGATIVE"
  | "XOR"
  | "UNBALANCED";

export type PostingValidation =
  | { valid: true }
  | { valid: false; code: PostingValidationCode; reason: string; meta?: Record<string, unknown> };

// ── Internal helpers ─────────────────────────────────────────────────────────

/** True when exactly one of debit/credit is positive. */
function isXorPositive(debitMinor: bigint, creditMinor: bigint): boolean {
  return (debitMinor > 0n) !== (creditMinor > 0n);
}

function fail(
  code: PostingValidationCode,
  reason: string,
  meta?: Record<string, unknown>,
): PostingValidation {
  return { valid: false, code, reason, meta };
}

// ── Main validator ───────────────────────────────────────────────────────────

/**
 * Validate that a set of journal lines form a correct posting.
 *
 * Checks (in order):
 *   1. Non-empty.
 *   2. Every line has a non-empty accountId.
 *   3. Non-negative amounts (debit/credit ≥ 0).
 *   4. Each line has debit XOR credit > 0 (not both, not neither).
 *   5. Σ debitMinor === Σ creditMinor, grouped by currency.
 *
 * Returns first failure by default. Pass `{ mode: "all" }` for UI preflight
 * to collect every line-level error (balance check still returns one result).
 */
export function validateJournalBalance(
  lines: JournalLineInput[],
  opts: { mode?: "first" | "all" } = {},
): PostingValidation | PostingValidation[] {
  const mode = opts.mode ?? "first";

  if (lines.length === 0) {
    const result = fail("EMPTY", "Journal entry must have at least one line");
    return mode === "all" ? [result] : result;
  }

  // ── Per-line invariants ────────────────────────────────────────────────────
  const errors: PostingValidation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // accountId is required and must be non-empty
    if (!line.accountId) {
      const err = fail(
        "MISSING_ACCOUNT",
        `Line ${i}: accountId is required`,
        { lineIndex: i },
      );
      if (mode === "first") return err;
      errors.push(err);
      continue; // skip further checks on this line
    }

    // amounts must be non-negative
    if (line.debitMinor < 0n || line.creditMinor < 0n) {
      const err = fail(
        "NEGATIVE",
        `Line ${i}: amounts must be non-negative ` +
          `(debitMinor=${line.debitMinor}, creditMinor=${line.creditMinor})`,
        {
          lineIndex: i,
          debitMinor: line.debitMinor.toString(),
          creditMinor: line.creditMinor.toString(),
        },
      );
      if (mode === "first") return err;
      errors.push(err);
      continue;
    }

    // XOR: exactly one of debit/credit must be > 0
    if (!isXorPositive(line.debitMinor, line.creditMinor)) {
      const err = fail(
        "XOR",
        `Line ${i}: each line must carry a debit OR a credit (> 0), not both and not neither ` +
          `(debitMinor=${line.debitMinor}, creditMinor=${line.creditMinor})`,
        {
          lineIndex: i,
          debitMinor: line.debitMinor.toString(),
          creditMinor: line.creditMinor.toString(),
        },
      );
      if (mode === "first") return err;
      errors.push(err);
    }
  }

  // In "all" mode, return line errors before reaching balance check
  if (errors.length > 0) return errors;

  // ── Balance check: Σ debits === Σ credits per currency ─────────────────────
  const totals = new Map<CurrencyCode, { debit: bigint; credit: bigint }>();

  for (const line of lines) {
    const t = totals.get(line.currencyCode) ?? { debit: 0n, credit: 0n };
    t.debit += line.debitMinor;
    t.credit += line.creditMinor;
    totals.set(line.currencyCode, t);
  }

  for (const [currency, t] of totals.entries()) {
    if (t.debit !== t.credit) {
      const delta = t.debit - t.credit;
      const result = fail(
        "UNBALANCED",
        `Journal imbalance for ${currency}`,
        {
          currency,
          debits: t.debit.toString(),
          credits: t.credit.toString(),
          delta: delta.toString(),
        },
      );
      if (mode === "all") return [result];
      return result;
    }
  }

  return mode === "all" ? [] : { valid: true };
}
