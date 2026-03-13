import { describe, expect, it } from "vitest";

import { makeMoney } from "../money";
import {
  bigIntToDbBigint,
  dbBigintToBigInt,
  deserializeMoney,
  eventSerialize,
  jsonReplacer,
  jsonReviver,
  moneyJsonReplacer,
  moneyJsonReviver,
  parseWithMoney,
  serializeMoney,
  stringifyEventPayload,
  stringifyWithMoney,
} from "../money-transport";

describe("shared money transport", () => {
  it("serializes money to json-safe shape", () => {
    const money = makeMoney({ amountMinor: "123", currencyCode: "USD" });
    expect(serializeMoney(money)).toEqual({ amountMinor: "123", currencyCode: "USD" });
  });

  it("deserializes payload into validated money", () => {
    const parsed = deserializeMoney({ amountMinor: "456", currencyCode: "EUR" });
    expect(parsed.amountMinor).toBe(456n);
    expect(parsed.currencyCode).toBe("EUR");
  });

  it("replaces bigint values during stringify", () => {
    const money = makeMoney({ amountMinor: "789", currencyCode: "USD" });
    const json = JSON.stringify({ money }, moneyJsonReplacer);
    expect(json).toContain('"amountMinor":"789"');

    const jsonAlias = JSON.stringify({ money }, jsonReplacer);
    expect(jsonAlias).toContain('"amountMinor":"789"');
  });

  it("revives amountMinor numeric strings as bigint only", () => {
    const parsed = JSON.parse(
      '{"amountMinor":"1000","other":"1000","currencyCode":"USD"}',
      moneyJsonReviver,
    ) as { amountMinor: unknown; other: unknown };

    expect(parsed.amountMinor).toBe(1000n);
    expect(parsed.other).toBe("1000");

    const parsedAlias = JSON.parse(
      '{"amountMinor":"2000","other":"2000","currencyCode":"USD"}',
      jsonReviver,
    ) as { amountMinor: unknown; other: unknown };
    expect(parsedAlias.amountMinor).toBe(2000n);
    expect(parsedAlias.other).toBe("2000");
  });

  it("supports stringify and parse roundtrip", () => {
    const input = { money: makeMoney({ amountMinor: "42", currencyCode: "USD" }) };
    const json = stringifyWithMoney(input);
    const output = parseWithMoney<{ money: { amountMinor: bigint; currencyCode: string } }>(json);

    expect(output.money.amountMinor).toBe(42n);
    expect(output.money.currencyCode).toBe("USD");
  });

  it("maps db bigint values safely", () => {
    expect(dbBigintToBigInt("123")).toBe(123n);
    expect(dbBigintToBigInt(456n)).toBe(456n);
    expect(dbBigintToBigInt(789)).toBe(789n);
    expect(bigIntToDbBigint(900n)).toBe("900");
  });

  it("throws on unsafe number db bigint input", () => {
    expect(() => dbBigintToBigInt(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      "db bigint number must be a safe integer",
    );
  });

  it("serializes event payload bigint/date to string-safe json", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");
    const payload = {
      amountMinor: 123n,
      occurredAt: now,
      nested: { count: 5n },
    };

    const json = stringifyEventPayload(payload);
    expect(json).toContain('"amountMinor":"123"');
    expect(json).toContain('"occurredAt":"2026-03-13T00:00:00.000Z"');
    expect(json).toContain('"count":"5"');

    const parsed = eventSerialize(payload) as {
      amountMinor: string;
      occurredAt: string;
      nested: { count: string };
    };
    expect(parsed.amountMinor).toBe("123");
    expect(parsed.occurredAt).toBe("2026-03-13T00:00:00.000Z");
    expect(parsed.nested.count).toBe("5");
  });
});
