import { z } from "zod";

import { CurrencyCodeSchema, type CurrencyCode } from "./money.js";

function isPowerOfTen(value: number): boolean {
  if (!Number.isInteger(value) || value <= 0) {
    return false;
  }
  while (value > 1) {
    if (value % 10 !== 0) {
      return false;
    }
    value /= 10;
  }
  return true;
}

function precisionForMinorPerMajor(minorPerMajor: number): number {
  let precision = 0;
  let value = minorPerMajor;
  while (value > 1) {
    value /= 10;
    precision += 1;
  }
  return precision;
}

export const CurrencyMetaSchema = z
  .object({
    code: CurrencyCodeSchema,
    minorPerMajor: z.number().int().positive(),
    displayPrecision: z.number().int().min(0),
    isoNumeric: z
      .string()
      .regex(/^\d{3}$/)
      .optional(),
    symbol: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!isPowerOfTen(value.minorPerMajor)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minorPerMajor"],
        message: "minorPerMajor must be a power of 10 (1, 10, 100, 1000, ...)",
      });
    }

    if (isPowerOfTen(value.minorPerMajor)) {
      const expectedPrecision = precisionForMinorPerMajor(value.minorPerMajor);
      if (value.displayPrecision !== expectedPrecision) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["displayPrecision"],
          message: `displayPrecision must equal ${expectedPrecision} for minorPerMajor ${value.minorPerMajor}`,
        });
      }
    }
  });

export type CurrencyMeta = z.infer<typeof CurrencyMetaSchema>;

export const SEA_CURRENCY_CODES = [
  "BND",
  "KHR",
  "IDR",
  "LAK",
  "MYR",
  "MMK",
  "PHP",
  "SGD",
  "THB",
  "VND",
] as const satisfies readonly CurrencyCode[];

export const TOP_TRADED_CURRENCY_CODES = [
  "USD",
  "EUR",
  "JPY",
  "GBP",
  "CNY",
  "AUD",
  "CAD",
  "CHF",
  "HKD",
  "SGD",
] as const satisfies readonly CurrencyCode[];

const DEFAULT_REGISTRY: Record<CurrencyCode, CurrencyMeta> = {
  USD: {
    code: "USD",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "840",
    symbol: "USD",
    name: "US Dollar",
  },
  EUR: {
    code: "EUR",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "978",
    symbol: "EUR",
    name: "Euro",
  },
  GBP: {
    code: "GBP",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "826",
    symbol: "GBP",
    name: "Pound Sterling",
  },
  JPY: {
    code: "JPY",
    minorPerMajor: 1,
    displayPrecision: 0,
    isoNumeric: "392",
    symbol: "JPY",
    name: "Japanese Yen",
  },
  BHD: {
    code: "BHD",
    minorPerMajor: 1000,
    displayPrecision: 3,
    isoNumeric: "048",
    symbol: "BHD",
    name: "Bahraini Dinar",
  },
  AED: {
    code: "AED",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "784",
    symbol: "AED",
    name: "UAE Dirham",
  },
  INR: {
    code: "INR",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "356",
    symbol: "INR",
    name: "Indian Rupee",
  },
  CAD: {
    code: "CAD",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "124",
    symbol: "CAD",
    name: "Canadian Dollar",
  },
  AUD: {
    code: "AUD",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "036",
    symbol: "AUD",
    name: "Australian Dollar",
  },
  CHF: {
    code: "CHF",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "756",
    symbol: "CHF",
    name: "Swiss Franc",
  },
  CNY: {
    code: "CNY",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "156",
    symbol: "CNY",
    name: "Chinese Yuan",
  },
  HKD: {
    code: "HKD",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "344",
    symbol: "HKD",
    name: "Hong Kong Dollar",
  },
  SGD: {
    code: "SGD",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "702",
    symbol: "SGD",
    name: "Singapore Dollar",
  },
  BND: {
    code: "BND",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "096",
    symbol: "BND",
    name: "Brunei Dollar",
  },
  KHR: {
    code: "KHR",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "116",
    symbol: "KHR",
    name: "Cambodian Riel",
  },
  IDR: {
    code: "IDR",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "360",
    symbol: "IDR",
    name: "Indonesian Rupiah",
  },
  LAK: {
    code: "LAK",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "418",
    symbol: "LAK",
    name: "Lao Kip",
  },
  MYR: {
    code: "MYR",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "458",
    symbol: "MYR",
    name: "Malaysian Ringgit",
  },
  MMK: {
    code: "MMK",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "104",
    symbol: "MMK",
    name: "Myanmar Kyat",
  },
  PHP: {
    code: "PHP",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "608",
    symbol: "PHP",
    name: "Philippine Peso",
  },
  THB: {
    code: "THB",
    minorPerMajor: 100,
    displayPrecision: 2,
    isoNumeric: "764",
    symbol: "THB",
    name: "Thai Baht",
  },
  VND: {
    code: "VND",
    minorPerMajor: 1,
    displayPrecision: 0,
    isoNumeric: "704",
    symbol: "VND",
    name: "Vietnamese Dong",
  },
};

const registry = new Map<CurrencyCode, CurrencyMeta>(
  Object.entries(DEFAULT_REGISTRY) as [CurrencyCode, CurrencyMeta][],
);

export function getCurrencyMeta(code: string): CurrencyMeta {
  const key = CurrencyCodeSchema.parse(String(code).toUpperCase());
  const meta = registry.get(key);
  if (!meta) {
    throw new Error(`Currency not registered: ${key}`);
  }
  return meta;
}

export function tryGetCurrencyMeta(code: string): CurrencyMeta | undefined {
  const parsed = CurrencyCodeSchema.safeParse(String(code).toUpperCase());
  if (!parsed.success) {
    return undefined;
  }
  return registry.get(parsed.data);
}

export function registerCurrency(meta: CurrencyMeta, opts?: { override?: boolean }): void {
  const parsed = CurrencyMetaSchema.parse(meta);
  if (registry.has(parsed.code) && !opts?.override) {
    throw new Error(`Currency already registered: ${parsed.code}`);
  }
  registry.set(parsed.code, parsed);
}

export function listCurrencyCodes(): CurrencyCode[] {
  return Array.from(registry.keys()).sort();
}

export function resetRegistryToDefaults(): void {
  registry.clear();
  for (const [code, meta] of Object.entries(DEFAULT_REGISTRY) as [CurrencyCode, CurrencyMeta][]) {
    registry.set(code, meta);
  }
}

export function minorPerMajorFor(code: string): number {
  return getCurrencyMeta(code).minorPerMajor;
}

export function displayPrecisionFor(code: string): number {
  return getCurrencyMeta(code).displayPrecision;
}

export const CurrencyRegistry = {
  getCurrencyMeta,
  tryGetCurrencyMeta,
  registerCurrency,
  listCurrencyCodes,
  resetRegistryToDefaults,
  minorPerMajorFor,
  displayPrecisionFor,
};

export const DefaultCurrencyRegistry = DEFAULT_REGISTRY;

export const SharedCurrency = {
  CurrencyMetaSchema,
  SEA_CURRENCY_CODES,
  TOP_TRADED_CURRENCY_CODES,
  getCurrencyMeta,
  tryGetCurrencyMeta,
  registerCurrency,
  listCurrencyCodes,
  resetRegistryToDefaults,
  minorPerMajorFor,
  displayPrecisionFor,
  CurrencyRegistry,
};

export default CurrencyRegistry;
