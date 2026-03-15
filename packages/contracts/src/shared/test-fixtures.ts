import { SharedJournalEntrySchema, type SharedJournalEntry } from "./journal.js";
import { MoneySchema, type CurrencyCode, type Money } from "./money.js";

export type RNG = {
  next(): number;
  nextInt(maxExclusive: number): number;
  nextHex(length: number): string;
};

const DEFAULT_DATE_BASE_ISO = "2026-01-01T00:00:00.000Z";
const DAY_MS = 24 * 60 * 60 * 1000;

function hashSeed(seed: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  return hash >>> 0;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }
}

function assertCurrencyCode(value: string): CurrencyCode {
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new Error(`currencyCode must be ISO 4217 uppercase (received: ${value})`);
  }
  return value as CurrencyCode;
}

export function createSeededRng(seed: string): RNG {
  let state = hashSeed(seed);

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };

  const nextInt = (maxExclusive: number): number => {
    assertPositiveInteger(maxExclusive, "maxExclusive");
    return Math.floor(next() * maxExclusive);
  };

  const nextHex = (length: number): string => {
    assertPositiveInteger(length, "length");
    const hex = "0123456789abcdef";
    let output = "";
    for (let i = 0; i < length; i += 1) {
      output += hex[nextInt(16)];
    }
    return output;
  };

  return { next, nextInt, nextHex };
}

export function deterministicUuid(rng: RNG): string {
  const bytes = Array.from({ length: 16 }, () => rng.nextInt(256));
  bytes[6] = ((bytes[6] as number) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80;

  const hex = bytes.map((value) => value.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export type MoneyFixtureOptions = {
  rng?: RNG;
  amountMinor?: bigint;
  currencyCode?: string;
  minMajor?: number;
  maxMajor?: number;
  minorPerMajor?: bigint;
};

export function makeMoneyFixture(opts: MoneyFixtureOptions = {}): Money {
  const rng = opts.rng ?? createSeededRng("money-default");
  const currencyCode = assertCurrencyCode(opts.currencyCode ?? "USD");

  if (opts.amountMinor !== undefined) {
    return MoneySchema.parse({ amountMinor: opts.amountMinor, currencyCode });
  }

  const minMajor = opts.minMajor ?? 1;
  const maxMajor = opts.maxMajor ?? 1000;
  assertInteger(minMajor, "minMajor");
  assertInteger(maxMajor, "maxMajor");
  if (maxMajor < minMajor) {
    throw new Error("maxMajor must be >= minMajor");
  }

  const minorPerMajor = opts.minorPerMajor ?? 100n;
  if (minorPerMajor <= 0n) {
    throw new Error("minorPerMajor must be > 0");
  }

  const range = maxMajor - minMajor + 1;
  const major = minMajor + rng.nextInt(range);
  const fractional = BigInt(rng.nextInt(Number(minorPerMajor)));
  const amountMinor = BigInt(major) * minorPerMajor + fractional;

  return MoneySchema.parse({ amountMinor, currencyCode });
}

export type DateFixtureOptions = {
  rng?: RNG;
  baseIso?: string;
  offsetDays?: number;
  maxOffsetDays?: number;
};

export function makeDateFixture(opts: DateFixtureOptions = {}): string {
  const rng = opts.rng ?? createSeededRng("date-default");
  const base = new Date(opts.baseIso ?? DEFAULT_DATE_BASE_ISO);
  if (Number.isNaN(base.getTime())) {
    throw new Error("baseIso must be a valid ISO datetime string");
  }

  let offsetDays = 0;
  if (opts.offsetDays !== undefined) {
    assertInteger(opts.offsetDays, "offsetDays");
    offsetDays = opts.offsetDays;
  } else {
    const maxOffsetDays = opts.maxOffsetDays ?? 365;
    assertPositiveInteger(maxOffsetDays, "maxOffsetDays");
    offsetDays = rng.nextInt(maxOffsetDays);
  }

  const offsetMs = offsetDays * DAY_MS + rng.nextInt(DAY_MS);
  return new Date(base.getTime() + offsetMs).toISOString();
}

export type JournalEntryFixtureOptions = {
  rng?: RNG;
  entryId?: string;
  occurredAt?: string;
  accountId?: string;
  debitMinor?: bigint;
  creditMinor?: bigint;
  currencyCode?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type MinorRange = {
  min: bigint;
  max: bigint;
  seed?: string;
};

export function randomMoney(minorRange: MinorRange, currencyCode = "USD"): Money {
  if (minorRange.max < minorRange.min) {
    throw new Error("minorRange.max must be >= minorRange.min");
  }

  const span = minorRange.max - minorRange.min + 1n;
  if (span <= 0n) {
    throw new Error("minorRange span must be > 0");
  }

  const rng = createSeededRng(minorRange.seed ?? `money-${currencyCode}`);
  const randomWithinSpan = BigInt(rng.nextInt(Number(span)));
  return MoneySchema.parse({
    amountMinor: minorRange.min + randomWithinSpan,
    currencyCode: assertCurrencyCode(currencyCode),
  });
}

export type UtcDateRange = {
  fromIso: string;
  toIso: string;
  seed?: string;
};

export function randomUtcDate(range: UtcDateRange): string {
  const from = new Date(range.fromIso);
  const to = new Date(range.toIso);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("fromIso and toIso must be valid ISO datetime strings");
  }
  if (to.getTime() < from.getTime()) {
    throw new Error("toIso must be >= fromIso");
  }

  const rng = createSeededRng(range.seed ?? "utc-date-range");
  const windowMs = to.getTime() - from.getTime();
  const offsetMs = windowMs === 0 ? 0 : rng.nextInt(windowMs + 1);
  return new Date(from.getTime() + offsetMs).toISOString();
}

export async function runPropertyHarness<T>(opts: {
  iterations: number;
  sample: () => T;
  property: (value: T, index: number) => void | Promise<void>;
}): Promise<void> {
  assertPositiveInteger(opts.iterations, "iterations");
  for (let i = 0; i < opts.iterations; i += 1) {
    const value = opts.sample();
    await opts.property(value, i);
  }
}

export function makeJournalEntryFixture(opts: JournalEntryFixtureOptions = {}): SharedJournalEntry {
  const rng = opts.rng ?? createSeededRng("journal-default");
  const amount = BigInt(1 + rng.nextInt(10000));

  const debitMinor = opts.debitMinor ?? (opts.creditMinor !== undefined ? 0n : amount);
  const creditMinor = opts.creditMinor ?? (opts.debitMinor !== undefined ? 0n : 0n);

  if (debitMinor < 0n || creditMinor < 0n) {
    throw new Error("debitMinor and creditMinor must be non-negative");
  }
  const debitPositive = debitMinor > 0n;
  const creditPositive = creditMinor > 0n;
  if (debitPositive === creditPositive) {
    throw new Error("exactly one of debitMinor or creditMinor must be > 0");
  }

  const entry = {
    entryId: opts.entryId ?? deterministicUuid(rng),
    occurredAt: opts.occurredAt ?? makeDateFixture({ rng, maxOffsetDays: 365 }),
    accountId: opts.accountId ?? deterministicUuid(rng),
    debitMinor,
    creditMinor,
    currencyCode: assertCurrencyCode(opts.currencyCode ?? "USD"),
    source: opts.source ?? "fixture",
    metadata: opts.metadata ?? {},
  };

  return SharedJournalEntrySchema.parse(entry);
}

export type SeedGeneratorOptions = {
  seed?: string;
  currencyCodes?: string[];
  permissions?: string[];
  currencyMinorMap?: Record<string, number>;
};

export type CurrencySeed = {
  code: string;
  name: string;
  minorPerMajor: bigint;
  displayOrder: number;
};

export type PermissionSeed = {
  key: string;
  description: string;
};

export type CurrencyMetaSeed = {
  code: string;
  minor_per_major: number;
};

function deterministicShuffle<T>(values: readonly T[], rng: RNG): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    const current = out[i] as T;
    out[i] = out[j] as T;
    out[j] = current;
  }
  return out;
}

export function seedGenerator(opts: SeedGeneratorOptions = {}): {
  currencies: CurrencySeed[];
  permissions: PermissionSeed[];
  currencyMeta: CurrencyMetaSeed[];
} {
  const rng = createSeededRng(opts.seed ?? "seed-default");

  const currencyCodes = opts.currencyCodes ?? ["USD", "EUR", "JPY", "GBP"];
  const currencies = currencyCodes.map((code, index) => {
    const minorPerMajor = opts.currencyMinorMap?.[code] ?? (code === "JPY" ? 1 : 100);
    return {
      code: assertCurrencyCode(code),
      name: `${code}-Currency`,
      minorPerMajor: BigInt(minorPerMajor),
      displayOrder: index,
    };
  });

  const permissionKeys = opts.permissions ?? [
    "ledger.read",
    "ledger.write",
    "payments.create",
    "payments.read",
  ];
  const permissions = deterministicShuffle(permissionKeys, rng).map((key) => ({
    key,
    description: `Permission for ${key}`,
  }));

  const currencyMeta = currencies.map((currency) => ({
    code: currency.code,
    minor_per_major: Number(currency.minorPerMajor),
  }));

  return { currencies, permissions, currencyMeta };
}

export function sampleLedgerBatch(seed: string, n = 10): SharedJournalEntry[] {
  assertPositiveInteger(n, "n");

  const rng = createSeededRng(seed);
  const currencies = ["USD", "EUR", "JPY"];
  const result: SharedJournalEntry[] = [];

  for (let i = 0; i < n; i += 1) {
    const entry = makeJournalEntryFixture({
      rng,
      currencyCode: currencies[rng.nextInt(currencies.length)],
      accountId: deterministicUuid(rng),
    });
    result.push(entry);
  }

  return result;
}

export const TestFixtures = {
  createSeededRng,
  deterministicUuid,
  makeMoneyFixture,
  makeDateFixture,
  makeJournalEntryFixture,
  randomMoney,
  randomUtcDate,
  runPropertyHarness,
  seedGenerator,
  sampleLedgerBatch,
};

export default TestFixtures;
