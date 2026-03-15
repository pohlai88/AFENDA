import { z } from "zod";

import { UtcDateTimeSchema } from "./datetime.js";
import { AccountIdSchema, JournalEntryIdSchema } from "./ids.js";
import { CurrencyCodeSchema, type CurrencyCode } from "./money.js";

const AmountMinorInput = z.preprocess((value) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isInteger(value)) return BigInt(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+$/.test(trimmed)) return BigInt(trimmed);
  }
  return value;
}, z.bigint());

const JournalEntrySchema = z
  .object({
    entryId: JournalEntryIdSchema,
    occurredAt: UtcDateTimeSchema,
    accountId: AccountIdSchema,
    debitMinor: AmountMinorInput.default(0n),
    creditMinor: AmountMinorInput.default(0n),
    currencyCode: CurrencyCodeSchema,
    source: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.debitMinor < 0n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["debitMinor"],
        message: "debitMinor must be >= 0",
      });
    }

    if (value.creditMinor < 0n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditMinor"],
        message: "creditMinor must be >= 0",
      });
    }

    const debitPositive = value.debitMinor > 0n;
    const creditPositive = value.creditMinor > 0n;

    if (!debitPositive && !creditPositive) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["debitMinor"],
        message: "one of debitMinor or creditMinor must be > 0",
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditMinor"],
        message: "one of debitMinor or creditMinor must be > 0",
      });
    }

    if (debitPositive && creditPositive) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["debitMinor"],
        message: "only one of debitMinor or creditMinor may be > 0",
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditMinor"],
        message: "only one of debitMinor or creditMinor may be > 0",
      });
    }
  });

type JournalEntry = z.infer<typeof JournalEntrySchema>;
export const SharedJournalEntrySchema = JournalEntrySchema;
export type SharedJournalEntry = JournalEntry;

export type AccountBalance = {
  amountMinor: bigint;
  currencyCode: CurrencyCode;
};

function compareEntries(a: SharedJournalEntry, b: SharedJournalEntry): number {
  if (a.occurredAt < b.occurredAt) return -1;
  if (a.occurredAt > b.occurredAt) return 1;
  if (a.entryId < b.entryId) return -1;
  if (a.entryId > b.entryId) return 1;
  return 0;
}

export function validateJournalEntry(input: unknown): SharedJournalEntry {
  return JournalEntrySchema.parse(input);
}

function parseEntries(entries: readonly SharedJournalEntry[]): SharedJournalEntry[] {
  return entries.map((entry) => JournalEntrySchema.parse(entry));
}

function cloneBalances(
  startingBalances: ReadonlyMap<string, AccountBalance>,
): Map<string, AccountBalance> {
  const balances = new Map<string, AccountBalance>();
  for (const [accountId, balance] of startingBalances.entries()) {
    balances.set(accountId, {
      amountMinor: balance.amountMinor,
      currencyCode: balance.currencyCode,
    });
  }
  return balances;
}

function applyParsedEntries(
  balances: Map<string, AccountBalance>,
  parsedEntries: readonly SharedJournalEntry[],
): Map<string, AccountBalance> {
  const sortedEntries = [...parsedEntries].sort(compareEntries);

  for (const entry of sortedEntries) {
    const net = entry.debitMinor - entry.creditMinor;
    const accountId = entry.accountId;
    const existing = balances.get(accountId);

    if (!existing) {
      balances.set(accountId, {
        amountMinor: net,
        currencyCode: entry.currencyCode,
      });
      continue;
    }

    if (existing.currencyCode !== entry.currencyCode) {
      throw new Error(
        `Currency mismatch for account ${accountId}: existing ${existing.currencyCode} vs entry ${entry.currencyCode}`,
      );
    }

    balances.set(accountId, {
      amountMinor: existing.amountMinor + net,
      currencyCode: existing.currencyCode,
    });
  }

  return balances;
}

export function applyJournalEntries(
  startingBalances: ReadonlyMap<string, AccountBalance>,
  entries: readonly SharedJournalEntry[],
): Map<string, AccountBalance> {
  const parsedEntries = parseEntries(entries);
  const balances = cloneBalances(startingBalances);
  return applyParsedEntries(balances, parsedEntries);
}

export function recomputeBalances(
  entries: readonly SharedJournalEntry[],
): Map<string, AccountBalance> {
  const parsedEntries = parseEntries(entries);
  const balances = new Map<string, AccountBalance>();
  return applyParsedEntries(balances, parsedEntries);
}

export const SharedJournal = {
  SharedJournalEntrySchema,
  validateJournalEntry,
  applyJournalEntries,
  recomputeBalances,
};

export default SharedJournal;
