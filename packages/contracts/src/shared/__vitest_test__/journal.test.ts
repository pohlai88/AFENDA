import { describe, expect, it } from "vitest";

import {
  JournalEntrySchema,
  applyJournalEntries,
  recomputeBalances,
  validateJournalEntry,
} from "../journal";

const ACCOUNT_A = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_B = "22222222-2222-4222-8222-222222222222";
const ENTRY_1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const ENTRY_2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const ENTRY_3 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3";

describe("shared journal", () => {
  it("validates canonical journal entry", () => {
    const parsed = validateJournalEntry({
      entryId: ENTRY_1,
      occurredAt: "2026-03-13T10:00:00.000Z",
      accountId: ACCOUNT_A,
      debitMinor: "1000",
      creditMinor: "0",
      currencyCode: "USD",
    });

    expect(parsed.debitMinor).toBe(1000n);
    expect(parsed.creditMinor).toBe(0n);
  });

  it("enforces debit/credit invariants", () => {
    const bothZero = JournalEntrySchema.safeParse({
      entryId: ENTRY_1,
      occurredAt: "2026-03-13T10:00:00.000Z",
      accountId: ACCOUNT_A,
      debitMinor: "0",
      creditMinor: "0",
      currencyCode: "USD",
    });
    expect(bothZero.success).toBe(false);

    const bothPositive = JournalEntrySchema.safeParse({
      entryId: ENTRY_1,
      occurredAt: "2026-03-13T10:00:00.000Z",
      accountId: ACCOUNT_A,
      debitMinor: "1",
      creditMinor: "1",
      currencyCode: "USD",
    });
    expect(bothPositive.success).toBe(false);
  });

  it("applies entries in deterministic occurredAt then entryId order", () => {
    const entries = [
      {
        entryId: ENTRY_2,
        occurredAt: "2026-03-13T10:00:00.000Z",
        accountId: ACCOUNT_A,
        debitMinor: "50",
        creditMinor: "0",
        currencyCode: "USD",
      },
      {
        entryId: ENTRY_1,
        occurredAt: "2026-03-13T10:00:00.000Z",
        accountId: ACCOUNT_A,
        debitMinor: "100",
        creditMinor: "0",
        currencyCode: "USD",
      },
      {
        entryId: ENTRY_3,
        occurredAt: "2026-03-13T11:00:00.000Z",
        accountId: ACCOUNT_A,
        debitMinor: "0",
        creditMinor: "25",
        currencyCode: "USD",
      },
    ];

    const balances = applyJournalEntries(
      new Map(),
      entries.map((entry) => JournalEntrySchema.parse(entry)),
    );
    expect(balances.get(ACCOUNT_A)?.amountMinor).toBe(125n);
  });

  it("throws when account currency changes across entries", () => {
    const entries = [
      JournalEntrySchema.parse({
        entryId: ENTRY_1,
        occurredAt: "2026-03-13T10:00:00.000Z",
        accountId: ACCOUNT_A,
        debitMinor: "100",
        creditMinor: "0",
        currencyCode: "USD",
      }),
      JournalEntrySchema.parse({
        entryId: ENTRY_2,
        occurredAt: "2026-03-13T10:01:00.000Z",
        accountId: ACCOUNT_A,
        debitMinor: "0",
        creditMinor: "10",
        currencyCode: "EUR",
      }),
    ];

    expect(() => recomputeBalances(entries)).toThrowError(/Currency mismatch/i);
  });

  it("recomputes balances for multiple accounts", () => {
    const entries = [
      JournalEntrySchema.parse({
        entryId: ENTRY_1,
        occurredAt: "2026-03-13T10:00:00.000Z",
        accountId: ACCOUNT_A,
        debitMinor: "100",
        creditMinor: "0",
        currencyCode: "USD",
      }),
      JournalEntrySchema.parse({
        entryId: ENTRY_2,
        occurredAt: "2026-03-13T10:01:00.000Z",
        accountId: ACCOUNT_A,
        debitMinor: "0",
        creditMinor: "30",
        currencyCode: "USD",
      }),
      JournalEntrySchema.parse({
        entryId: ENTRY_3,
        occurredAt: "2026-03-13T10:02:00.000Z",
        accountId: ACCOUNT_B,
        debitMinor: "80",
        creditMinor: "0",
        currencyCode: "USD",
      }),
    ];

    const balances = recomputeBalances(entries);
    expect(balances.get(ACCOUNT_A)?.amountMinor).toBe(70n);
    expect(balances.get(ACCOUNT_B)?.amountMinor).toBe(80n);
  });
});
