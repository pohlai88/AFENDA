import { MoneySchema, type Money } from "./money.js";

export function dbBigintToBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      throw new Error("db bigint string must be an integer");
    }
    return BigInt(trimmed);
  }

  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("db bigint number must be a safe integer");
    }
    return BigInt(value);
  }

  throw new Error("unsupported db bigint value type");
}

export function bigIntToDbBigint(value: bigint): string {
  return value.toString();
}

export function moneyJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

export const jsonReplacer = moneyJsonReplacer;

export function eventJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

export function moneyJsonReviver(key: string, value: unknown): unknown {
  if (key === "amountMinor" && typeof value === "string" && /^-?\d+$/.test(value)) {
    try {
      return BigInt(value);
    } catch {
      return value;
    }
  }
  return value;
}

export const jsonReviver = moneyJsonReviver;

export function serializeMoney(money: Money): { amountMinor: string; currencyCode: string } {
  const parsed = MoneySchema.parse(money);
  return {
    amountMinor: parsed.amountMinor.toString(),
    currencyCode: parsed.currencyCode,
  };
}

export function deserializeMoney(payload: unknown): Money {
  return MoneySchema.parse(payload);
}

export function stringifyWithMoney(obj: unknown): string {
  return JSON.stringify(obj, moneyJsonReplacer);
}

export function parseWithMoney<T = unknown>(json: string): T {
  return JSON.parse(json, moneyJsonReviver) as T;
}

export function stringifyEventPayload(payload: unknown): string {
  return JSON.stringify(payload, eventJsonReplacer);
}

export function eventSerialize<T>(payload: T): unknown {
  return JSON.parse(stringifyEventPayload(payload));
}

export const MoneyTransport = {
  dbBigintToBigInt,
  bigIntToDbBigint,
  moneyJsonReplacer,
  jsonReplacer,
  moneyJsonReviver,
  jsonReviver,
  eventJsonReplacer,
  serializeMoney,
  deserializeMoney,
  stringifyWithMoney,
  parseWithMoney,
  stringifyEventPayload,
  eventSerialize,
};

export default MoneyTransport;
