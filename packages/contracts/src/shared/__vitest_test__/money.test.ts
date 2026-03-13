import { describe, expect, it } from "vitest";

import {
  MAX_ABSOLUTE_MINOR,
  MoneySchema,
  deserializeMoney,
  formatMinorAsMajor,
  makeMoney,
  moneyJsonReplacer,
  serializeMoney,
} from "../money";

describe("shared money", () => {
  it("coerces numeric string to bigint", () => {
    const parsed = MoneySchema.parse({ amountMinor: "12345", currencyCode: "USD" });
    expect(parsed.amountMinor).toBe(12345n);
  });

  it("coerces integer number to bigint", () => {
    const parsed = MoneySchema.parse({ amountMinor: 12345, currencyCode: "USD" });
    expect(parsed.amountMinor).toBe(12345n);
  });

  it("rejects decimal numeric strings", () => {
    const result = MoneySchema.safeParse({ amountMinor: "12.34", currencyCode: "USD" });
    expect(result.success).toBe(false);
  });

  it("rejects lowercase currency codes", () => {
    const result = MoneySchema.safeParse({ amountMinor: "100", currencyCode: "usd" });
    expect(result.success).toBe(false);
  });

  it("rejects amounts beyond MAX_ABSOLUTE_MINOR", () => {
    const tooLarge = (MAX_ABSOLUTE_MINOR + 1n).toString();
    const result = MoneySchema.safeParse({ amountMinor: tooLarge, currencyCode: "USD" });
    expect(result.success).toBe(false);
  });

  it("serializes and deserializes money safely", () => {
    const money = makeMoney({ amountMinor: "123", currencyCode: "USD" });

    const serialized = serializeMoney(money);
    expect(serialized).toEqual({ amountMinor: "123", currencyCode: "USD" });

    const deserialized = deserializeMoney(serialized);
    expect(deserialized.amountMinor).toBe(123n);
    expect(deserialized.currencyCode).toBe("USD");
  });

  it("stringifies bigint values via moneyJsonReplacer", () => {
    const money = makeMoney({ amountMinor: "123", currencyCode: "USD" });
    const json = JSON.stringify({ m: money }, moneyJsonReplacer);

    expect(json).toContain('"amountMinor":"123"');
  });

  it("formats minor values as major string", () => {
    expect(formatMinorAsMajor(12345n, 100)).toBe("123.45");
    expect(formatMinorAsMajor(-99n, 100)).toBe("-0.99");
  });
});
