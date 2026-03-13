import { afterEach, describe, expect, it } from "vitest";

import {
  CurrencyMetaSchema,
  SEA_CURRENCY_CODES,
  TOP_TRADED_CURRENCY_CODES,
  displayPrecisionFor,
  getCurrencyMeta,
  listCurrencyCodes,
  minorPerMajorFor,
  registerCurrency,
  resetRegistryToDefaults,
  tryGetCurrencyMeta,
} from "../currency";

describe("shared currency registry", () => {
  afterEach(() => {
    resetRegistryToDefaults();
  });

  it("returns metadata for default currencies", () => {
    const usd = getCurrencyMeta("USD");
    expect(usd.code).toBe("USD");
    expect(usd.minorPerMajor).toBe(100);
    expect(usd.displayPrecision).toBe(2);
  });

  it("normalizes lowercase code input for lookups", () => {
    expect(getCurrencyMeta("usd").code).toBe("USD");
  });

  it("returns undefined for invalid currency code lookup", () => {
    expect(tryGetCurrencyMeta("US")).toBeUndefined();
  });

  it("registers new currencies and lists sorted codes", () => {
    registerCurrency({
      code: "XTS",
      minorPerMajor: 100,
      displayPrecision: 2,
      isoNumeric: "963",
      name: "Test Currency",
    });

    expect(getCurrencyMeta("XTS").name).toBe("Test Currency");
    expect(listCurrencyCodes()).toContain("XTS");
  });

  it("rejects duplicate registration unless override is true", () => {
    expect(() =>
      registerCurrency({
        code: "USD",
        minorPerMajor: 100,
        displayPrecision: 2,
      }),
    ).toThrow(/already registered/);

    registerCurrency(
      {
        code: "USD",
        minorPerMajor: 100,
        displayPrecision: 2,
        name: "US Dollar Override",
      },
      { override: true },
    );

    expect(getCurrencyMeta("USD").name).toBe("US Dollar Override");
  });

  it("validates minorPerMajor and precision pairing", () => {
    const badMinor = CurrencyMetaSchema.safeParse({
      code: "XAA",
      minorPerMajor: 25,
      displayPrecision: 2,
    });
    expect(badMinor.success).toBe(false);

    const badPrecision = CurrencyMetaSchema.safeParse({
      code: "XAB",
      minorPerMajor: 100,
      displayPrecision: 3,
    });
    expect(badPrecision.success).toBe(false);
  });

  it("supports convenience lookup helpers", () => {
    expect(minorPerMajorFor("BHD")).toBe(1000);
    expect(displayPrecisionFor("JPY")).toBe(0);
  });

  it("can reset registry back to defaults", () => {
    registerCurrency({
      code: "XTS",
      minorPerMajor: 100,
      displayPrecision: 2,
      isoNumeric: "963",
      name: "Test Currency",
    });
    expect(getCurrencyMeta("XTS").code).toBe("XTS");

    resetRegistryToDefaults();

    expect(tryGetCurrencyMeta("XTS")).toBeUndefined();
    expect(getCurrencyMeta("USD").code).toBe("USD");
  });

  it("includes all targeted South East Asia currency codes", () => {
    const available = new Set(listCurrencyCodes());

    for (const code of SEA_CURRENCY_CODES) {
      expect(available.has(code)).toBe(true);
    }
  });

  it("includes the globally top-traded currency set", () => {
    const available = new Set(listCurrencyCodes());

    for (const code of TOP_TRADED_CURRENCY_CODES) {
      expect(available.has(code)).toBe(true);
    }
  });
});
