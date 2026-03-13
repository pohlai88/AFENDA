import { describe, expect, it } from "vitest";

import {
  absMoney,
  addMoney,
  compareMoney,
  formatMoney,
  multiplyMoneyByInt,
  negateMoney,
  scaleMoneyByInt,
  scaleMoneyByRatio,
  subtractMoney,
  sumByCurrency,
  sumMoney,
} from "../money-utils";
import { makeMoney } from "../money";

describe("shared money utils", () => {
  const usd10 = makeMoney({ amountMinor: "1000", currencyCode: "USD" });
  const usd25 = makeMoney({ amountMinor: "2500", currencyCode: "USD" });
  const eur10 = makeMoney({ amountMinor: "1000", currencyCode: "EUR" });

  it("adds and subtracts same-currency money", () => {
    expect(addMoney(usd10, usd25).amountMinor).toBe(3500n);
    expect(subtractMoney(usd25, usd10).amountMinor).toBe(1500n);
  });

  it("rejects mixed-currency arithmetic", () => {
    expect(() => addMoney(usd10, eur10)).toThrowError(/currency mismatch/i);
  });

  it("supports multiply, negate and abs", () => {
    expect(multiplyMoneyByInt(usd10, 3).amountMinor).toBe(3000n);
    expect(negateMoney(usd10).amountMinor).toBe(-1000n);
    expect(absMoney(negateMoney(usd10)).amountMinor).toBe(1000n);
  });

  it("compares same-currency values", () => {
    expect(compareMoney(usd10, usd25)).toBe(-1);
    expect(compareMoney(usd25, usd10)).toBe(1);
    expect(compareMoney(usd10, makeMoney({ amountMinor: "1000", currencyCode: "USD" }))).toBe(0);
  });

  it("sums same-currency lists", () => {
    expect(sumMoney([usd10, usd25]).amountMinor).toBe(3500n);
    expect(() => sumMoney([])).toThrowError(/at least one/i);
  });

  it("rejects mixed currencies in sumMoney", () => {
    expect(() => sumMoney([usd10, eur10])).toThrowError(/Currency mismatch/i);
  });

  it("scales by rational ratio with half-away-from-zero rounding", () => {
    expect(
      scaleMoneyByRatio(makeMoney({ amountMinor: "100", currencyCode: "USD" }), 15n, 10n)
        .amountMinor,
    ).toBe(150n);
    expect(
      scaleMoneyByRatio(makeMoney({ amountMinor: "5", currencyCode: "USD" }), 1n, 2n).amountMinor,
    ).toBe(3n);
    expect(
      scaleMoneyByRatio(makeMoney({ amountMinor: "-5", currencyCode: "USD" }), 1n, 2n).amountMinor,
    ).toBe(-3n);
  });

  it("scales by integer multiplier", () => {
    expect(scaleMoneyByInt(usd10, 3n).amountMinor).toBe(3000n);
    expect(scaleMoneyByInt(usd10, -2n).amountMinor).toBe(-2000n);
  });

  it("groups totals by currency", () => {
    const grouped = sumByCurrency([usd10, usd25, eur10]);
    expect(grouped.get("USD")?.amountMinor).toBe(3500n);
    expect(grouped.get("EUR")?.amountMinor).toBe(1000n);
  });

  it("formats money with currency prefix", () => {
    expect(formatMoney(usd25, 100)).toBe("USD 25.00");
  });

  it("formats money using currency registry precision by default", () => {
    const bhd = makeMoney({ amountMinor: "12345", currencyCode: "BHD" });
    expect(formatMoney(bhd)).toBe("BHD 12.345");
  });

  it("rejects zero denominator for scaleMoneyByRatio", () => {
    expect(() => scaleMoneyByRatio(usd10, 1n, 0n)).toThrowError(/denominator/i);
  });
});
