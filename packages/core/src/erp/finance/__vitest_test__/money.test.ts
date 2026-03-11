import { describe, expect, it } from "vitest";
import type { CurrencyCode, Money } from "@afenda/contracts";
import {
  minorExponent,
  minorFactor,
  fromMinorUnits,
  fromMajorUnitsInt,
  fromMajorDecimalString,
  addMoney,
  subtractMoney,
  negateMoney,
  absMoney,
  isZero,
  compareMoney,
  multiplyByInt,
  allocateProRata,
  toMajorDecimalString,
  assertNonNegative,
} from "../money/money";

// ── Helpers ──────────────────────────────────────────────────────────────────

const USD = "USD" as CurrencyCode;
const JPY = "JPY" as CurrencyCode;
const BHD = "BHD" as CurrencyCode;
const MGA = "MGA" as CurrencyCode;

function usd(cents: bigint): Money {
  return fromMinorUnits(cents, USD);
}

// ── minorExponent / minorFactor ──────────────────────────────────────────────

describe("minorExponent", () => {
  it("returns 2 for standard currencies (USD, EUR)", () => {
    expect(minorExponent(USD)).toBe(2);
    expect(minorExponent("EUR" as CurrencyCode)).toBe(2);
  });

  it("returns 0 for zero-decimal currencies (JPY, KRW)", () => {
    expect(minorExponent(JPY)).toBe(0);
    expect(minorExponent("KRW" as CurrencyCode)).toBe(0);
  });

  it("returns 3 for three-decimal currencies (BHD, KWD)", () => {
    expect(minorExponent(BHD)).toBe(3);
    expect(minorExponent("KWD" as CurrencyCode)).toBe(3);
  });

  it("returns 1 for one-decimal currencies (MGA)", () => {
    expect(minorExponent(MGA)).toBe(1);
  });
});

describe("minorFactor", () => {
  it("returns 100n for USD", () => expect(minorFactor(USD)).toBe(100n));
  it("returns 1n for JPY", () => expect(minorFactor(JPY)).toBe(1n));
  it("returns 1000n for BHD", () => expect(minorFactor(BHD)).toBe(1000n));
  it("returns 10n for MGA", () => expect(minorFactor(MGA)).toBe(10n));
});

// ── Constructors ─────────────────────────────────────────────────────────────

describe("fromMinorUnits", () => {
  it("constructs Money with exact minor units", () => {
    const m = fromMinorUnits(12345n, USD);
    expect(m.amountMinor).toBe(12345n);
    expect(m.currencyCode).toBe("USD");
  });

  it("handles negative amounts", () => {
    const m = fromMinorUnits(-500n, USD);
    expect(m.amountMinor).toBe(-500n);
  });

  it("handles zero", () => {
    const m = fromMinorUnits(0n, USD);
    expect(m.amountMinor).toBe(0n);
  });
});

describe("fromMajorUnitsInt", () => {
  it("converts whole dollars to cents", () => {
    const m = fromMajorUnitsInt(12n, USD);
    expect(m.amountMinor).toBe(1200n);
  });

  it("converts JPY 1-to-1 (exponent 0)", () => {
    const m = fromMajorUnitsInt(5000n, JPY);
    expect(m.amountMinor).toBe(5000n);
  });

  it("converts BHD with 3-decimal exponent", () => {
    const m = fromMajorUnitsInt(1n, BHD);
    expect(m.amountMinor).toBe(1000n);
  });

  it("handles negative major units", () => {
    const m = fromMajorUnitsInt(-10n, USD);
    expect(m.amountMinor).toBe(-1000n);
  });

  it("handles zero", () => {
    const m = fromMajorUnitsInt(0n, USD);
    expect(m.amountMinor).toBe(0n);
  });
});

describe("fromMajorDecimalString", () => {
  it("parses standard decimal", () => {
    const m = fromMajorDecimalString("123.45", USD);
    expect(m.amountMinor).toBe(12345n);
  });

  it("parses integer-only string", () => {
    const m = fromMajorDecimalString("100", USD);
    expect(m.amountMinor).toBe(10000n);
  });

  it("parses negative decimal", () => {
    const m = fromMajorDecimalString("-50.25", USD);
    expect(m.amountMinor).toBe(-5025n);
  });

  it("parses zero", () => {
    const m = fromMajorDecimalString("0", USD);
    expect(m.amountMinor).toBe(0n);
  });

  it("parses negative zero as 0n", () => {
    const m = fromMajorDecimalString("-0", USD);
    expect(m.amountMinor).toBe(0n);
  });

  it("parses 0.00 correctly", () => {
    const m = fromMajorDecimalString("0.00", USD);
    expect(m.amountMinor).toBe(0n);
  });

  it("pads short fractional parts", () => {
    const m = fromMajorDecimalString("1.5", USD);
    expect(m.amountMinor).toBe(150n);
  });

  it("handles 3-decimal currencies", () => {
    const m = fromMajorDecimalString("1.234", BHD);
    expect(m.amountMinor).toBe(1234n);
  });

  it("handles 0-decimal currencies (no fraction allowed)", () => {
    const m = fromMajorDecimalString("500", JPY);
    expect(m.amountMinor).toBe(500n);
  });

  it("throws on sub-minor-unit precision", () => {
    expect(() => fromMajorDecimalString("1.999", USD)).toThrow(/more decimal/);
  });

  it("throws on too many decimals for JPY", () => {
    expect(() => fromMajorDecimalString("1.5", JPY)).toThrow(/more decimal/);
  });

  it("throws on non-numeric string", () => {
    expect(() => fromMajorDecimalString("abc", USD)).toThrow(/invalid decimal/);
  });

  it("rejects + sign", () => {
    expect(() => fromMajorDecimalString("+5.00", USD)).toThrow(/invalid decimal/);
  });

  it("rejects locale separators", () => {
    expect(() => fromMajorDecimalString("1,000.00", USD)).toThrow(/invalid decimal/);
  });

  it("rejects whitespace", () => {
    expect(() => fromMajorDecimalString(" 5.00", USD)).toThrow(/invalid decimal/);
  });

  it("rejects bare dot", () => {
    expect(() => fromMajorDecimalString(".5", USD)).toThrow(/invalid decimal/);
  });
});

// ── Arithmetic ───────────────────────────────────────────────────────────────

describe("addMoney", () => {
  it("adds two positive amounts", () => {
    const result = addMoney(usd(100n), usd(250n));
    expect(result.amountMinor).toBe(350n);
  });

  it("adds positive and negative", () => {
    const result = addMoney(usd(100n), usd(-30n));
    expect(result.amountMinor).toBe(70n);
  });

  it("throws on currency mismatch", () => {
    expect(() => addMoney(usd(100n), fromMinorUnits(100n, JPY))).toThrow(/currency mismatch/);
  });
});

describe("subtractMoney", () => {
  it("subtracts correctly", () => {
    const result = subtractMoney(usd(500n), usd(200n));
    expect(result.amountMinor).toBe(300n);
  });

  it("can produce negative result", () => {
    const result = subtractMoney(usd(100n), usd(200n));
    expect(result.amountMinor).toBe(-100n);
  });

  it("throws on currency mismatch", () => {
    expect(() => subtractMoney(usd(100n), fromMinorUnits(100n, JPY))).toThrow(/currency mismatch/);
  });
});

describe("negateMoney", () => {
  it("negates positive", () => {
    expect(negateMoney(usd(100n)).amountMinor).toBe(-100n);
  });

  it("negates negative", () => {
    expect(negateMoney(usd(-100n)).amountMinor).toBe(100n);
  });

  it("negates zero", () => {
    expect(negateMoney(usd(0n)).amountMinor).toBe(0n);
  });
});

describe("absMoney", () => {
  it("returns same for positive", () => {
    expect(absMoney(usd(100n)).amountMinor).toBe(100n);
  });

  it("returns positive for negative", () => {
    expect(absMoney(usd(-100n)).amountMinor).toBe(100n);
  });

  it("returns zero for zero", () => {
    expect(absMoney(usd(0n)).amountMinor).toBe(0n);
  });
});

describe("isZero", () => {
  it("returns true for zero", () => {
    expect(isZero(usd(0n))).toBe(true);
  });

  it("returns false for positive", () => {
    expect(isZero(usd(1n))).toBe(false);
  });

  it("returns false for negative", () => {
    expect(isZero(usd(-1n))).toBe(false);
  });
});

describe("compareMoney", () => {
  it("returns 0 for equal amounts", () => {
    expect(compareMoney(usd(100n), usd(100n))).toBe(0);
  });

  it("returns -1 when a < b", () => {
    expect(compareMoney(usd(99n), usd(100n))).toBe(-1);
  });

  it("returns 1 when a > b", () => {
    expect(compareMoney(usd(101n), usd(100n))).toBe(1);
  });

  it("throws on currency mismatch", () => {
    expect(() => compareMoney(usd(100n), fromMinorUnits(100n, JPY))).toThrow(/currency mismatch/);
  });
});

describe("multiplyByInt", () => {
  it("multiplies by positive integer", () => {
    const result = multiplyByInt(usd(500n), 3n);
    expect(result.amountMinor).toBe(1500n);
  });

  it("multiplies by zero", () => {
    const result = multiplyByInt(usd(500n), 0n);
    expect(result.amountMinor).toBe(0n);
  });

  it("multiplies by negative integer", () => {
    const result = multiplyByInt(usd(500n), -2n);
    expect(result.amountMinor).toBe(-1000n);
  });

  it("handles large quantities", () => {
    const result = multiplyByInt(usd(100n), 1000000n);
    expect(result.amountMinor).toBe(100000000n);
  });
});

// ── allocateProRata ──────────────────────────────────────────────────────────

describe("allocateProRata", () => {
  it("splits evenly when weights are equal", () => {
    const result = allocateProRata(usd(300n), [1n, 1n, 1n]);
    expect(result.map((m) => m.amountMinor)).toEqual([100n, 100n, 100n]);
  });

  it("distributes remainder via largest-remainder method", () => {
    // $1.00 split 3 ways: 34 + 33 + 33 = 100
    const result = allocateProRata(usd(100n), [1n, 1n, 1n]);
    const amounts = result.map((m) => m.amountMinor);
    expect(amounts.reduce((a, b) => a + b, 0n)).toBe(100n);
    // First gets the extra cent
    expect(amounts).toEqual([34n, 33n, 33n]);
  });

  it("handles weighted split (e.g. 70/30)", () => {
    const result = allocateProRata(usd(1000n), [7n, 3n]);
    expect(result.map((m) => m.amountMinor)).toEqual([700n, 300n]);
  });

  it("handles single weight", () => {
    const result = allocateProRata(usd(999n), [1n]);
    expect(result[0]!.amountMinor).toBe(999n);
  });

  it("handles zero total", () => {
    const result = allocateProRata(usd(0n), [1n, 2n, 3n]);
    expect(result.every((m) => m.amountMinor === 0n)).toBe(true);
  });

  it("handles negative total (credit memo split)", () => {
    const result = allocateProRata(usd(-300n), [1n, 1n, 1n]);
    expect(result.map((m) => m.amountMinor)).toEqual([-100n, -100n, -100n]);
  });

  it("sum always equals total (invariant)", () => {
    // Stress test with an awkward split
    const total = usd(9999n);
    const weights = [3n, 7n, 11n, 13n];
    const result = allocateProRata(total, weights);
    const sum = result.reduce((s, m) => s + m.amountMinor, 0n);
    expect(sum).toBe(9999n);
  });

  it("preserves currency code", () => {
    const result = allocateProRata(fromMinorUnits(100n, BHD), [1n, 1n]);
    result.forEach((m) => expect(m.currencyCode).toBe("BHD"));
  });

  it("throws on empty weights", () => {
    expect(() => allocateProRata(usd(100n), [])).toThrow(/must not be empty/);
  });

  it("throws on all-zero weights", () => {
    expect(() => allocateProRata(usd(100n), [0n, 0n])).toThrow(/must be > 0/);
  });
});

// ── toMajorDecimalString ─────────────────────────────────────────────────────

describe("toMajorDecimalString", () => {
  it("formats standard USD amount", () => {
    expect(toMajorDecimalString(usd(12345n))).toBe("123.45");
  });

  it("formats zero", () => {
    expect(toMajorDecimalString(usd(0n))).toBe("0.00");
  });

  it("formats negative amount", () => {
    expect(toMajorDecimalString(usd(-5025n))).toBe("-50.25");
  });

  it("formats sub-dollar amount", () => {
    expect(toMajorDecimalString(usd(5n))).toBe("0.05");
  });

  it("formats JPY (0 decimals)", () => {
    expect(toMajorDecimalString(fromMinorUnits(500n, JPY))).toBe("500");
  });

  it("formats BHD (3 decimals)", () => {
    expect(toMajorDecimalString(fromMinorUnits(1234n, BHD))).toBe("1.234");
  });

  it("roundtrips with fromMajorDecimalString", () => {
    const original = "999.99";
    const m = fromMajorDecimalString(original, USD);
    expect(toMajorDecimalString(m)).toBe(original);
  });

  it("roundtrips negative values", () => {
    const original = "-42.00";
    const m = fromMajorDecimalString(original, USD);
    expect(toMajorDecimalString(m)).toBe(original);
  });
});

// ── assertNonNegative ────────────────────────────────────────────────────────

describe("assertNonNegative", () => {
  it("passes for positive amount", () => {
    expect(() => assertNonNegative(usd(100n))).not.toThrow();
  });

  it("passes for zero", () => {
    expect(() => assertNonNegative(usd(0n))).not.toThrow();
  });

  it("throws for negative amount", () => {
    expect(() => assertNonNegative(usd(-1n))).toThrow(/non-negative/);
  });

  it("includes label in error message", () => {
    expect(() => assertNonNegative(usd(-1n), "invoice total")).toThrow(/invoice total/);
  });
});
