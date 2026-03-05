import { describe, expect, it } from "vitest";
import type { CurrencyCode } from "@afenda/contracts";
import { validateJournalBalance, type PostingValidation } from "../posting.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const USD = "USD" as CurrencyCode;
const MYR = "MYR" as CurrencyCode;

/** Unwrap single PostingValidation (default "first" mode). */
function first(r: PostingValidation | PostingValidation[]): PostingValidation {
  if (Array.isArray(r)) throw new Error("Expected single result, got array");
  return r;
}

/** Unwrap PostingValidation[] ("all" mode). */
function all(r: PostingValidation | PostingValidation[]): PostingValidation[] {
  if (!Array.isArray(r)) throw new Error("Expected array, got single result");
  return r;
}

// ── Default mode ("first") ───────────────────────────────────────────────────

describe("validateJournalBalance", () => {
  it("accepts a balanced entry", () => {
    const result = first(
      validateJournalBalance([
        { accountId: "a1", debitMinor: 10000n, creditMinor: 0n, currencyCode: USD },
        { accountId: "a2", debitMinor: 0n, creditMinor: 10000n, currencyCode: USD },
      ]),
    );
    expect(result.valid).toBe(true);
  });

  it("rejects an imbalanced entry with delta in meta", () => {
    const result = first(
      validateJournalBalance([
        { accountId: "a1", debitMinor: 10000n, creditMinor: 0n, currencyCode: USD },
        { accountId: "a2", debitMinor: 0n, creditMinor: 9999n, currencyCode: USD },
      ]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("UNBALANCED");
      expect(result.reason).toMatch(/imbalance/);
      expect(result.meta?.delta).toBe("1"); // debits - credits = 1
    }
  });

  it("rejects an empty entry", () => {
    const result = first(validateJournalBalance([]));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("EMPTY");
    }
  });

  it("groups by currency independently", () => {
    const result = first(
      validateJournalBalance([
        { accountId: "a1", debitMinor: 5000n, creditMinor: 0n, currencyCode: USD },
        { accountId: "a2", debitMinor: 0n, creditMinor: 5000n, currencyCode: USD },
        { accountId: "a3", debitMinor: 3000n, creditMinor: 0n, currencyCode: MYR },
        { accountId: "a4", debitMinor: 0n, creditMinor: 3000n, currencyCode: MYR },
      ]),
    );
    expect(result.valid).toBe(true);
  });

  // ── MISSING_ACCOUNT ─────────────────────────────────────────────────────────

  it("rejects a line with empty accountId", () => {
    const result = first(
      validateJournalBalance([
        { accountId: "", debitMinor: 100n, creditMinor: 0n, currencyCode: USD },
        { accountId: "a2", debitMinor: 0n, creditMinor: 100n, currencyCode: USD },
      ]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("MISSING_ACCOUNT");
      expect(result.meta?.lineIndex).toBe(0);
    }
  });

  it("MISSING_ACCOUNT is checked before NEGATIVE and XOR", () => {
    // Line has empty accountId AND negative amount — MISSING_ACCOUNT wins
    const result = first(
      validateJournalBalance([
        { accountId: "", debitMinor: -100n, creditMinor: 0n, currencyCode: USD },
      ]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("MISSING_ACCOUNT");
    }
  });

  // ── XOR per-line invariant ────────────────────────────────────────────────

  it("rejects a line with both debit and credit > 0 (double-sided line)", () => {
    const result = first(
      validateJournalBalance([
        { accountId: "a1", debitMinor: 10000n, creditMinor: 10000n, currencyCode: USD },
      ]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("XOR");
      expect(result.reason).toMatch(/Line 0/);
      expect(result.reason).toMatch(/debit OR a credit/);
    }
  });

  it("rejects a line where both debit and credit are zero (zero-line)", () => {
    const result = first(
      validateJournalBalance([
        { accountId: "a1", debitMinor: 0n, creditMinor: 0n, currencyCode: USD },
      ]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("XOR");
      expect(result.reason).toMatch(/Line 0/);
      expect(result.reason).toMatch(/debit OR a credit/);
    }
  });

  it("rejects a balanced-total entry with a double-sided line (XOR caught first)", () => {
    const result = first(
      validateJournalBalance([
        { accountId: "a1", debitMinor: 100n, creditMinor: 100n, currencyCode: USD },
        { accountId: "a2", debitMinor: 100n, creditMinor: 100n, currencyCode: USD },
      ]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("XOR");
      expect(result.reason).toMatch(/Line 0/);
    }
  });

  it("rejects a single-currency entry where only debits are present", () => {
    const result = first(
      validateJournalBalance([
        { accountId: "a1", debitMinor: 5000n, creditMinor: 0n, currencyCode: USD },
        { accountId: "a2", debitMinor: 5000n, creditMinor: 0n, currencyCode: USD },
      ]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("UNBALANCED");
      expect(result.reason).toMatch(/imbalance/);
    }
  });

  // ── Non-negative invariant ──────────────────────────────────────────────

  it("rejects a line with a negative debit amount", () => {
    const result = first(
      validateJournalBalance([
        { accountId: "a1", debitMinor: -5000n, creditMinor: 0n, currencyCode: USD },
        { accountId: "a2", debitMinor: 0n, creditMinor: 5000n, currencyCode: USD },
      ]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("NEGATIVE");
      expect(result.reason).toMatch(/non-negative/);
    }
  });

  it("rejects a line with a negative credit amount", () => {
    const result = first(
      validateJournalBalance([
        { accountId: "a1", debitMinor: 5000n, creditMinor: 0n, currencyCode: USD },
        { accountId: "a2", debitMinor: 0n, creditMinor: -5000n, currencyCode: USD },
      ]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("NEGATIVE");
      expect(result.reason).toMatch(/non-negative/);
    }
  });
});

// ── "all" mode (UI preflight) ────────────────────────────────────────────────

describe('validateJournalBalance mode: "all"', () => {
  it("returns empty array for valid entry", () => {
    const results = all(
      validateJournalBalance(
        [
          { accountId: "a1", debitMinor: 100n, creditMinor: 0n, currencyCode: USD },
          { accountId: "a2", debitMinor: 0n, creditMinor: 100n, currencyCode: USD },
        ],
        { mode: "all" },
      ),
    );
    expect(results).toEqual([]);
  });

  it("collects multiple line errors", () => {
    const results = all(
      validateJournalBalance(
        [
          { accountId: "", debitMinor: 100n, creditMinor: 0n, currencyCode: USD },
          { accountId: "a2", debitMinor: 0n, creditMinor: 0n, currencyCode: USD },
          { accountId: "a3", debitMinor: -1n, creditMinor: 0n, currencyCode: USD },
        ],
        { mode: "all" },
      ),
    );
    expect(results.length).toBe(3);
    expect(results.map((r) => !r.valid && r.code)).toEqual(["MISSING_ACCOUNT", "XOR", "NEGATIVE"]);
  });

  it("returns EMPTY as single-element array", () => {
    const results = all(validateJournalBalance([], { mode: "all" }));
    expect(results.length).toBe(1);
    expect(!results[0]!.valid && results[0]!.code).toBe("EMPTY");
  });

  it("returns UNBALANCED when lines are individually valid but totals mismatch", () => {
    const results = all(
      validateJournalBalance(
        [
          { accountId: "a1", debitMinor: 100n, creditMinor: 0n, currencyCode: USD },
          { accountId: "a2", debitMinor: 0n, creditMinor: 99n, currencyCode: USD },
        ],
        { mode: "all" },
      ),
    );
    expect(results.length).toBe(1);
    if (!results[0]!.valid) {
      expect(results[0]!.code).toBe("UNBALANCED");
      expect(results[0]!.meta?.delta).toBe("1");
    }
  });

  it("reports line errors before balance errors", () => {
    // Line 1 has XOR violation AND totals would be imbalanced.
    // "all" mode collects line errors first, never reaches balance check.
    const results = all(
      validateJournalBalance(
        [
          { accountId: "a1", debitMinor: 100n, creditMinor: 0n, currencyCode: USD },
          { accountId: "a2", debitMinor: 0n, creditMinor: 0n, currencyCode: USD },
        ],
        { mode: "all" },
      ),
    );
    expect(results.length).toBe(1);
    expect(!results[0]!.valid && results[0]!.code).toBe("XOR");
  });
});
