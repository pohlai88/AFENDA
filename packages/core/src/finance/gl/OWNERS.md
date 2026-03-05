# core/finance/gl — OWNERS

> **Inherits all rules from [`packages/core/OWNERS.md`](../../../../OWNERS.md)
> and [`packages/core/src/finance/OWNERS.md`](../OWNERS.md).**
> This file covers only what is specific to the `gl/` subdirectory.

## Purpose

General Ledger domain — journal entry posting, reversal, and GL-specific
query functions (journal listing, trial balance, account listing).

| ✅ Belongs                                                    | ❌ Never here                                       |
| ------------------------------------------------------------- | --------------------------------------------------- |
| Journal entry posting and reversal service                    | Zod schemas for GL commands (→ `@afenda/contracts`) |
| Balance validation (delegates to `../posting.ts`)             | Account/GL table DDL (→ `@afenda/db`)               |
| GL query functions (journal entries, accounts, trial balance) | HTTP route handlers (→ `apps/api`)                  |
| Cursor-paginated read models                                  | Worker event dispatch (→ `apps/worker`)             |
| Future: period close, retained earnings                       | UI components (→ `@afenda/ui`)                      |

---

## Dependency Whitelist

`finance/gl/` may import:

| Allowed import                                                                           | Why                                                           |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `@afenda/contracts`                                                                      | Types, branded IDs, pagination constants                      |
| `@afenda/db`                                                                             | Table references for queries and mutations                    |
| `drizzle-orm`                                                                            | Query operators (`eq`, `and`, `desc`, `gt`, `inArray`, `sql`) |
| Sibling barrels within `@afenda/core` (`../../infra/*.js`, `../posting.js`, `../sod.js`) | Audit, numbering, posting invariants, SoD policies            |

---

## Files

| File                                      | Key exports                                                                                                                                                                   | Notes                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `posting.service.ts`                      | `postToGL`, `reverseJournalEntry`, `GLServiceResult<T>`, `GLServiceError`                                                                                                     | Posting validates SoD via `canPostToGL`, runs `validateJournalBalance`, verifies all accounts exist + active. Uses `withAudit` + `nextNumber("journalEntry")` in same tx. Emits outbox events (`GL.JOURNAL_POSTED`, `GL.JOURNAL_REVERSED`). Reversal creates a new entry with `reversalOfId` reference and swapped debit↔credit. |
| `gl.queries.ts`                           | `listJournalEntries`, `getJournalEntryById`, `listAccounts`, `getTrialBalance`, `JournalEntryRow`, `JournalLineRow`, `AccountRow`, `TrialBalanceRow`, `JournalEntryWithLines` | Read-only queries. Journal + account listing with cursor pagination. `getJournalEntryById` returns entry with nested lines. `getTrialBalance` is a real-time aggregate via SQL `SUM` grouped by account.                                                                                                                          |
| `index.ts`                                | Barrel — re-exports service + queries                                                                                                                                         | No logic.                                                                                                                                                                                                                                                                                                                         |
| `__vitest_test__/posting.service.test.ts` | 8 tests                                                                                                                                                                       | Covers: postToGL (success, missing permission, unbalanced journal, account not found, account inactive), reverseJournalEntry (success, missing permission, entry not found).                                                                                                                                                      |

---

## Posting Rules (Hard)

1. **Balance validation** is delegated to `validateJournalBalance()` from
   `../posting.ts` — the pure invariant checker. The posting service calls it
   before any DB mutation.
2. **Account verification** — all account IDs in journal lines must exist and
   be active (`isActive: true`). Missing → `GL_ACCOUNT_NOT_FOUND`, inactive →
   `GL_ACCOUNT_INACTIVE`.
3. **SoD enforcement** — `canPostToGL()` from `../sod.js` validates that the
   principal has `Permissions.glJournalPost`.
4. **Outbox events** are inserted in the **same transaction** as the journal entry.
5. **Reversal semantics** — creates a new journal entry with `reversalOfId`
   referencing the original. All lines have debit↔credit swapped. Original
   entry is NOT mutated.
6. **Gap-free numbering** — `nextNumber("journalEntry")` called inside the
   posting transaction. Format: `JE-{YYYY}-{seq}`.

---

## Service Function Shape

All service functions follow:

```ts
async function action(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  ...params
): Promise<GLServiceResult<T>>;
```

`GLServiceResult<T>` is a discriminated union:

- `{ ok: true; data: T }`
- `{ ok: false; error: GLServiceError }`

---

## Future Growth

| File (expected)    | Purpose                                                     |
| ------------------ | ----------------------------------------------------------- |
| `trial-balance.ts` | Dedicated trial balance service (if query complexity grows) |
| `period-close.ts`  | Period close logic — freeze entries, post retained earnings |
