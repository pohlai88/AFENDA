# core/finance — OWNERS

> **Package-wide rules (import boundaries, no-Zod, service function shape,
> domain vs infra separation) are inherited from the root
> [`packages/core/OWNERS.md`](../../OWNERS.md).
> This file covers only what is specific to the `finance/` directory.**

## Purpose

Financial domain logic: money arithmetic, journal-posting invariants, and
Separation-of-Duties policy rules.

**This is accounting logic, not CRUD.** All invariant checks and domain
policy decisions that touch money or GL live here.

| ✅ Belongs | ❌ Never here |
|---|---|
| Money arithmetic (add, subtract, negate, compare, multiply, allocate) | Zod schemas for invoices/GL commands (→ `@afenda/contracts`) |
| Deterministic conversion (`toMajorDecimalString`, `fromMajorDecimalString`) | Invoice DB table DDL (→ `@afenda/db`) |
| Float-free constructors (`fromMinorUnits`, `fromMajorUnitsInt`) | HTTP route handlers (→ `apps/api`) |
| Pro-rata allocation (`allocateProRata` — largest-remainder rounding) | S3 upload / presigned-URL logic (→ `apps/api` or `document/`) |
| Journal balance validation (MISSING_ACCOUNT, NEGATIVE, XOR, UNBALANCED) | Locale-aware formatting / display (→ `@afenda/ui/money`) |
| SoD policy gates (`canApproveInvoice`, `canPostToGL`) | Role-name checks (always use `Permissions.*`, never role names) |
| ISO 4217 minor-unit exponent map (pinned dataset, CI TODO) | Float-based constructors (do not exist, by design) |
| Future: invoice state machine, GL posting, AP aging, period close | |

---

## Dependency Whitelist (Hard)

`core/finance` may import **only** these:

| Allowed import | Why |
|---|---|
| `@afenda/contracts` | Types (`Money`, `RequestContext`, `PrincipalId`, `Permissions`) |
| Sibling barrels within `@afenda/core` (e.g. `../infra/index.js`) | Cross-domain calls via barrel |

Everything else is **forbidden** — no `@afenda/db`, no `@afenda/ui`, no
`drizzle-orm`, no `node:*`, no `Date.now()`, no `Math.random()`, no
`process.env`. Finance functions are **pure**.

---

## File Conventions

| Pattern | Purpose |
|---|---|
| `*.ts` | Service / invariant / policy module — one core responsibility per file |
| `__vitest_test__/*.test.ts` | Vitest unit/integration tests in a dedicated subfolder |
| `__e2e_test__/*.e2e.ts` | E2E tests in a dedicated subfolder (when needed) |

Test files **must not** be colocated next to source files. They live in
`__vitest_test__/` (or `__e2e_test__/`) subfolders so they are excluded from
`tsc` build output and discoverable by convention. The CI gate
`tools/gates/test-location.mjs` enforces this.

When a subdomain reaches 3+ files, nest into a sub-barrel:
- `ap/` — invoice lifecycle (state machine, matching, aging)
- `gl/` — journal posting service, trial balance, period close

---

## Files

| File | Key exports | Notes |
|---|---|---|
| `money.ts` | **Constructors:** `fromMinorUnits(amountMinor, currencyCode)`, `fromMajorUnitsInt(major, currencyCode)`, `fromMajorDecimalString(s, currencyCode)`. **Arithmetic:** `addMoney`, `subtractMoney`, `negateMoney`, `absMoney`, `multiplyByInt`, `compareMoney`, `isZero`, `allocateProRata`. **Helpers:** `minorExponent`, `minorFactor`, `toMajorDecimalString`, `assertNonNegative`. **Types:** re-exports `Money`, `CurrencyCode` from contracts. | ISO 4217 exponent map covers 0-, 1-, 2-, 3-decimal currencies. All arithmetic uses `bigint` minor units — no safe-integer ceiling. No float constructors exist — `fromMajorUnitsInt` accepts `bigint` only; for fractional amounts use `fromMajorDecimalString`. |
| `posting.ts` | `JournalLineInput` (type), `PostingValidationCode` (union: `EMPTY \| MISSING_ACCOUNT \| NEGATIVE \| XOR \| UNBALANCED`), `PostingValidation` (discriminated union), `validateJournalBalance(lines, opts?)` | Checks (in order): non-empty → `MISSING_ACCOUNT` → non-negative → XOR → Σ balance per currency. `opts.mode: "first" \| "all"` — `"first"` (default) returns single result, `"all"` collects every line-level error for UI preflight. Returns stable codes + optional `meta` (includes `lineIndex`, `delta`). Pure function — no DB access. |
| `sod.ts` | `PolicyDenialCode` (union: `MISSING_PERMISSION \| SOD_SAME_PRINCIPAL \| MISSING_CONTEXT`), `PolicyResult` (discriminated union with optional `meta`), `PolicyContext` (type), `canApproveInvoice(ctx, submittedByPrincipalId)`, `canPostToGL(ctx)` | Uses `Permissions.*` from contracts. Fail-closed: missing principalId/submitterId yields `MISSING_CONTEXT`. Returns `{ allowed: false; code; reason; meta? }` — `meta` carries structured data for UI translation keys and audit trails. O(1) permission checks via `hasPermission()` from `../iam/permissions.js`. |
| `__vitest_test__/money.test.ts` | 77 tests | Covers: all constructors (minor/major-int/decimal-string), arithmetic ops, allocateProRata (rounding, symmetry, negative), compareMoney, isZero, absMoney, multiplyByInt, assertNonNegative, toMajorDecimalString, currency-mismatch guards, edge cases (0-decimal JPY, 3-decimal BHD, negative zero). |
| `__vitest_test__/posting.test.ts` | 17 tests | Covers: balanced, imbalanced + delta meta, empty, multi-currency, MISSING_ACCOUNT (empty + precedence), XOR (double-sided + zero-line + before-balance), NEGATIVE (debit + credit), "all" mode (valid, multi-error, EMPTY, UNBALANCED, line-errors-before-balance). |
| `__vitest_test__/sod.test.ts` | 11 tests | Covers: canApproveInvoice (permission denied, SoD violation, happy path, missing principalId, missing submitterId, null submitterId), canPostToGL (permission denied, happy path, missing permission). |
| `index.ts` | Domain barrel — re-exports all of the above | No logic. Tests are NOT re-exported. |

---

## Money Rules (Hard)

1. **No floats. Ever.** All amounts are `bigint` minor units — no precision ceiling.
   No constructor accepts `number`. `fromMajorUnitsInt` takes `bigint`;
   `fromMajorDecimalString` takes a string. Float-based builders do not exist.
2. **Currency-aware factor.** Never hardcode `/ 100` — use `minorFactor()`.
3. **Currency match.** `addMoney` / `subtractMoney` / `compareMoney` throw on mismatch.
4. **`Money` and `CurrencyCode` are owned by contracts.** Core re-exports — never
   redefines. `CurrencyCode` is a branded `z.string().regex(/^[A-Z]{3}$/)`.
5. **`CurrencyCode` everywhere.** All functions accept `CurrencyCode` (branded type),
   never `string`. This catches typos at the type level.
6. **No locale-aware formatting.** `toMajorDecimalString` produces a deterministic
   decimal string (e.g. `"123.45"`). Locale formatting lives in `@afenda/ui/money`.
7. **Allocation is exact.** `allocateProRata` uses largest-remainder rounding —
   the sum of allocations **always** equals the input total. No penny lost or created.
8. **API/JSON boundary.** `bigint` serialises as a **string** in JSON. Contracts
   model this cleanly via `z.coerce.bigint()` or string-based schemas.
9. **DB column.** Store as `numeric` (or `bigint` where safe). Domain stays `bigint`.

---

## Posting Invariant Rules (Hard)

1. **Non-empty:** at least one line required.
2. **Account required:** every line must have a non-empty `accountId` (`MISSING_ACCOUNT`).
3. **Non-negative:** `debitMinor < 0n` or `creditMinor < 0n` is rejected (`NEGATIVE`).
4. **XOR:** each line has `debitMinor > 0n` **or** `creditMinor > 0n`, not both,
   not neither (`XOR`).
5. **Balance:** `Σ debitMinor === Σ creditMinor`, grouped by `currencyCode`
   (`UNBALANCED`). Meta includes `delta` for the imbalance amount.
6. **Multi-currency reality:** balanced *per currency*; cross-currency entries
   require explicit FX conversion lines — no implicit conversion.

Checks run **in the order listed** — first detected code wins in `"first"` mode.
`"all"` mode collects every per-line error before reaching the balance check.

These are checked in `validateJournalBalance()` — a pure function with no DB
dependency — so the invariants are testable and composable.

**Return type** depends on `mode`:
- `"first"` (default): `PostingValidation` — single success or first failure.
- `"all"`: `PostingValidation[]` — empty array on success, all failures otherwise.

**Codes:** `EMPTY`, `MISSING_ACCOUNT`, `NEGATIVE`, `XOR`, `UNBALANCED` —
all with optional structured `meta` (includes `lineIndex`, `delta`, amounts).

---

## SoD Policy Conventions

- All policy functions accept `PolicyContext` — a deliberately narrow type:
  ```ts
  type PolicyContext = Readonly<{
    principalId?: PrincipalId;
    permissionsSet: ReadonlySet<string>;
  }>;
  ```
  This keeps the policy layer decoupled from full `RequestContext`.
- All policy functions return `PolicyResult`:
  `{ allowed: true } | { allowed: false; code: PolicyDenialCode; reason: string; meta?: Record<string, string> }`.
- `code` is a **stable, contract-safe string literal**:
  - `MISSING_PERMISSION` — required permission not in `permissionsSet`.
  - `SOD_SAME_PRINCIPAL` — submitter and approver are the same principal.
  - `MISSING_CONTEXT` — fail-closed when `principalId` or submitter ID is
    missing (migration safety — no silent pass-through).
- `meta` carries structured data for translation keys, UI rendering, and audit
  trails (e.g. `{ permission: "ap.invoice.approve" }`, `{ field: "principalId" }`).
  Never parse `reason` — use `code` + `meta`.
- Permission checks are **O(1)** via `hasPermission()` from `../iam/permissions.js`,
  which does `ctx.permissionsSet.has(perm)` — no array scanning.
- Permission strings are **always** referenced via `Permissions.*` from
  `@afenda/contracts` — never literal `"ap.invoice.approve"` strings.
- SoD checks compare `ctx.principalId !== submittedByPrincipalId` — never inspect
  role names directly. **No role-name checks, ever.** Permission-based only.

---

## No Side Effects — PR Checklist (Hard)

Every PR touching `core/finance` must satisfy:

- [ ] No DB imports (`@afenda/db`) — finance is pure
- [ ] No HTTP / file / S3
- [ ] No `Date.now()`, `Math.random()`, `crypto.randomUUID()`, or `process.env`
- [ ] Pure functions are total — explicit error union, no thrown exceptions for
      domain violations (use discriminated `{ ok: false; code }` returns)
- [ ] Any new invariant includes tests (unit + at least 1 property-style
      randomised test if feasible)

---

## Future Growth (S1)

| Subdirectory | Files (expected) |
|---|---|
| `ap/` | `invoice-lifecycle.ts` (state machine), `match.ts` (3-way matching), `aging.ts` (overdue buckets) |
| `gl/` | `journal.ts` (posting service), `trial-balance.ts`, `period-close.ts` |

Create the subdirectory + barrel as soon as the first file lands.

**Constraint:** State machines and calculators here are **pure transition /
derivation logic only** (no DB, no HTTP, no event publishing). Orchestration
lives in `apps/worker` / `apps/api` service layers that call these functions.

---

## Does NOT Belong Here

- `InvoiceSchema`, `InvoiceStatusValues` → `@afenda/contracts/invoice`
- `AccountSchema`, `AccountTypeValues` → `@afenda/contracts/gl`
- Invoice / GL DB table DDL → `@afenda/db`
- Evidence / document attachment → `document/`
- Audit log writes → `infra/audit.ts` (called by finance services, not owned here)
- Locale-aware money formatting → `@afenda/ui/money`
