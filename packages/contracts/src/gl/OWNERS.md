# contracts/gl — OWNERS

> **Package-wide rules (import boundaries, JSON-first types, barrel imports,
> file naming) are inherited from the root
> [`packages/contracts/OWNERS.md`](../../OWNERS.md).
> This file covers only what is specific to the `gl/` directory.**

## Purpose

General Ledger (Chart of Accounts) schemas and journal-posting commands.
**Scope: Chart of Accounts + journal posting interfaces only.** Reporting, balances, trial balance, period close, and consolidation are not defined here — they belong in core services and future reporting contracts.

## Contracts vs Core Boundary

| Allowed in contracts                                                                       | Belongs in `packages/core`                                                      |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Structural invariants (XOR debit/credit, required fields, min-unit money, JSON-safe types) | Accounting policy (period open/close, posting permissions, FX rules, tax rules) |
| Shape of `dimensions` object on journal lines                                              | Dimension derivation, cost-centre allocation, segment rules                     |
| Status/type vocabulary                                                                     | Balance validation, trial-balance closure, reconciliation                       |
| Event payload shape                                                                        | Event routing, retry policy, ledger locking                                     |

## File Conventions

| Pattern         | Purpose                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `*.entity.ts`   | Read-model DTOs (`AccountSchema`).                                                                                                             |
| `*.commands.ts` | Write payloads for journal operations. Split into `journal.commands.ts` + `journal.inputs.ts` if the file exceeds ~150 lines.                  |
| `*.events.ts`   | Domain events (future). Event `type` must follow `GL.JOURNAL_POSTED`, `GL.ENTRY_REVERSED` — matching the outbox `SCOPE.EVENT_NAME` convention. |

## Files

| File                | Key exports                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `account.entity.ts` | `AccountTypeValues`, `AccountTypeSchema`, `AccountType`, `AccountCodeSchema`, `AccountCode`, `AccountSchema`, `Account`                      |
| `gl.commands.ts`    | `JournalLineInputSchema`, `JournalLineInput`, `PostToGLCommandSchema`, `PostToGLCommand`, `ReverseEntryCommandSchema`, `ReverseEntryCommand` |
| `index.ts`          | Domain barrel — re-exports all of the above                                                                                                  |

## DB Alignment

Import `AccountTypeValues` in `packages/db/src/schema/finance.ts`:

```ts
import { AccountTypeValues } from "@afenda/contracts";
export const accountTypeEnum = pgEnum("account_type", AccountTypeValues);
```

The `account` table's `type` column must use `accountTypeEnum`, not `text`.

## Belongs Here

- `AccountTypeValues` / `AccountTypeSchema` / `AccountType`
- `AccountSchema` and inferred `Account` type
- `JournalLineInputSchema` — minimum required fields:
  - `accountId` (`AccountIdSchema`)
  - `debitMinor` XOR `creditMinor` (enforced via `.refine()`) — `z.coerce.bigint()`, non-negative
  - `currencyCode` (`CurrencyCodeSchema`)
  - `memo` (optional, `string.trim().max(500)`)
  - `dimensions` (optional, `z.record(z.string())` — JSON-safe key/value; derivation rules live in core)
- `PostToGLCommandSchema` (Σdebits = Σcredits `.refine()` on lines array), `ReverseEntryCommandSchema`
- Future: `gl.events.ts` for `GL.JOURNAL_POSTED`, `GL.ENTRY_REVERSED`
- All monetary fields must use `z.coerce.bigint()` (non-negative for line amounts; the XOR refine enforces sign semantics) and `CurrencyCodeSchema`.
- All identifiers must use shared branded IDs: `AccountIdSchema`, `JournalEntryIdSchema`, `OrgIdSchema`, `CorrelationIdSchema`.
- All write commands must carry `IdempotencyKeySchema`.

## Does NOT Belong Here

- Account / journalEntry / journalLine DB tables → `packages/db/src/schema/finance.ts`
- Balance validation business logic → `packages/core/src/posting.ts`
- Period close/open rules, posting permissions, FX revaluation, segment/dimension derivation → `packages/core`
