# contracts/shared — OWNERS

> **Package-wide rules (import boundaries, JSON-first types, barrel imports,
> file naming) are inherited from the root
> [`packages/contracts/OWNERS.md`](../../OWNERS.md).
> This file covers only what is specific to the `shared/` directory.**

## Purpose

Cross-cutting primitives used in **3 or more domains**.

`shared/` is not a junk drawer. **Default to domain folders.**
Escalate here only if a primitive meets **one of these two criteria**:

| Criterion                                | Examples                                 |
| ---------------------------------------- | ---------------------------------------- |
| Referenced across 3+ domain packages     | `InvoiceId` (AP + GL + evidence + audit) |
| Infrastructure cross-cut (always needed) | headers, envelopes, error codes          |

### Escape hatch (rare)

If a primitive genuinely belongs here but doesn't reach 3 domains yet, add a
comment at the top of the file pinning the reason:

```ts
// shared-exception: used by <invoice, supplier> because <reason>
```

Without that comment it will be moved to a domain folder at the next review.

---

## Files

| File                   | Key exports                                                                                                                                                                  | Notes                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `datetime.ts`          | `UtcDateTimeSchema`, `UtcDateTime`, `DateSchema`, `DateString`, `DateRangeSchema`, `DateRange`                                                                               | All timestamps must use `UtcDateTimeSchema` (no local offsets). All business dates must use `DateSchema`.    |
| `ids.ts`               | `UuidSchema`, `EntityIdSchema`, `brandedUuid()`, `CorrelationIdSchema`, `CorrelationId`, `OrgIdSchema`, `PrincipalIdSchema`, `SharedIds`, `generateUuid()`, parse helpers    | Shared ID primitives and cross-domain branded IDs. Keep additions justified with cross-domain comments.      |
| `clock.ts`             | `Clock`, `SystemClock`, `FixedClock`, `getClock()`, `setClock()`, `withClock()`, `withFixedClock()`, `now()`, `nowUtc()`, `nowMs()`, `SharedClock`                           | Shared time abstraction for deterministic testing and explicit time dependency management.                   |
| `errors.ts`            | `ErrorCodeValues`, `ErrorCodeSchema`, `ErrorCode`, `ApiErrorSchema`, `ApiError`                                                                                              | Namespaced codes — see below                                                                                 |
| `headers.ts`           | `CorrelationIdHeader`, `RequestIdHeader`, `IdempotencyKeyHeader`, `OrgIdHeader`, `DeprecationWarningHeader`, `HeaderNameValues`, `HeaderName`                                | Constants only — no Zod                                                                                      |
| `money.ts`             | `CurrencyCodeSchema`, `CurrencyCode`, `MoneySchema`, `Money`, `makeMoney()`, `serializeMoney()`, `deserializeMoney()`, `SharedMoney`                                         | Canonical transport-safe money contract (`bigint` minor units)                                               |
| `money-transport.ts`   | `moneyJsonReplacer()`, `moneyJsonReviver()`, `serializeMoney()`, `deserializeMoney()`, `stringifyWithMoney()`, `parseWithMoney()`, `MoneyTransport`                          | JSON transport helpers for bigint-safe wire payloads                                                         |
| `money-utils.ts`       | `addMoney()`, `subtractMoney()`, `sumMoney()`, `compareMoney()`, `formatMoney()`                                                                                             | Deterministic money helpers only; no FX/rate logic                                                           |
| `currency.ts`          | `CurrencyMetaSchema`, `CurrencyMeta`, `CurrencyRegistry`, `getCurrencyMeta()`, `registerCurrency()`, `listCurrencyCodes()`, `resetRegistryToDefaults()`                      | Canonical currency metadata registry for formatting, aggregation, and migration math                         |
| `journal.ts`           | `JournalEntrySchema`, `validateJournalEntry()`, `applyJournalEntries()`, `recomputeBalances()`, `SharedJournal`                                                              | Canonical ledger primitives and deterministic balance recomputation helpers                                  |
| `commands.ts`          | `BaseCommandSchema`, `BulkCommandSchema`, idempotency helpers                                                                                                                | Shared command primitives and common refinements                                                             |
| `pagination.ts`        | `CURSOR_LIMIT_DEFAULT`, `CURSOR_LIMIT_MAX`, `PaginationSchema`, `CursorParamsSchema`, cursor encode/decode helpers, `PageResult<T>`                                          | Versioned cursor payloads and opaque cursor helpers                                                          |
| `search.ts`            | `SearchQuerySchema`, `SearchResultSchema`, `SearchSortSchema`                                                                                                                | Shared search request/result primitives                                                                      |
| `queries.ts`           | `BaseQueryParamsSchema`, `IdQueryParamsSchema`, `QueryHandler<>`, query cache helpers, cursor SQL helpers                                                                    | Shared query contracts and adapter helpers                                                                   |
| `events.ts`            | `DomainEventSchema`, `EventEnvelopeSchema`, event helper factories                                                                                                           | Shared event contract primitives (transport-safe, schema-first)                                              |
| `schema-versioning.ts` | `withSchemaVersion()`, `attachSchemaVersion()`, `parseVersionedPayload()`, `makeVersionedCursorSchema()`, `parseVersionedCursor()`, `registerVersionedSchemas()`             | Shared schema versioning helpers for events, API payloads, and opaque cursors                                |
| `request-context.ts`   | `RequestContext`, `createRequestContext()`, `runWithRequestContext()`, `getRequestContext()`, `attachContextMiddleware()`, `ctxLogger()`, `ctxClock()`, `ctxCorrelationId()` | Request-scoped dependency carrier for clock/logger/flags/secrets with async propagation helpers              |
| `idempotency.ts`       | `IdempotencyKeySchema`, `IdempotencyStore`, `ensureIdempotency()`, `createInMemoryIdempotencyStore()`, `SharedIdempotency`                                                   | Shared idempotency primitives and dedupe helper for command/event ingestion paths                            |
| `idempotent-writes.ts` | `upsertById()`, `insertIfNotExists()`, `applyIfNotSeen()`, Postgres/Redis store adapters                                                                                     | Idempotent write primitives for atomic DB writes and store-backed event-entry dedupe                         |
| `audit.ts`             | `AuditFieldsSchema`, `AuditLogEntrySchema`, `createAuditLogEntry()`, `appendAudit()`, `redactAuditSnapshots()`, `SharedAudit`                                                | 7W1H-style audit envelope primitives for append-only audit trail events                                      |
| `db-migration.ts`      | `datePartitionColumnDefinition()`, `bigintColumnMigrationTemplate()`, `backfillValidator()`, `MigrationSqlSnippets`, `SharedDbMigration`                                     | Shared migration templates and backfill validation helpers for reproducible schema evolution                 |
| `migration-helpers.ts` | `datePartitionColumnDefinition()`, `bigintColumnMigrationTemplate()`, `backfillValidator(opts)`, `MigrationHelpers`                                                          | DB-query-driven migration helper module for runtime row-count/total/sample-diff validation during backfills  |
| `validation.ts`        | Shared refinements, schema builders, date-order helper utilities                                                                                                             | Reusable validation helpers for contract modules                                                             |
| `envelope.ts`          | `ErrorEnvelopeSchema`, `makeErrorEnvelope()`, `makeSuccessEnvelopeSchema()`, `makeSuccessEnvelope()`, `makeCursorEnvelopeSchema()`, `makeCursorEnvelope()`, envelope typings | Envelope schema factories + runtime constructors; depends on `ids` + `errors`                                |
| `permissions.ts`       | `PermissionValues`, `PermissionSchema`, `Permission`, `isPermission()`, `PermissionMeta`, `LegacyPermissionAliases`, `PERMISSION_SCOPES`                                     | Canonical permission registry. Canonical scope is `treasury.*`; legacy aliases remain for migration windows. |
| `index.ts`             | Barrel re-exports all shared modules                                                                                                                                         | Exports only, no logic                                                                                       |

---

## Rule: `headers.ts` — constants only, never Zod

`headers.ts` must export **only string constants** (and literal unions if needed).
No Zod schemas. No imports.

**Why:** Headers are consumed in every layer including edge runtimes and the
browser. Keeping them Zod-free avoids accidental bundle bloat and runtime
coupling.

```ts
// ✅ headers.ts
export const OrgIdHeader = "x-org-id" as const;

// ❌ never in headers.ts
export const OrgIdHeaderSchema = z.string(); // → move to envelope or request contract
```

If you need to _validate_ a header value, put the schema in the relevant
request-contract file (e.g. `iam/user.entity.ts`) or a dedicated
`headers.schema.ts` file.

---

## Rule: `ids.ts` — factory + justification required

- **`OrgId` / `PrincipalId`** live here unconditionally (every domain needs them).
- **Domain IDs** (`InvoiceId`, `SupplierId`, …) live here only if referenced across
  3+ domains. Each has a `// cross-domain: referenced by …` comment as proof.
- New domain IDs go in their **own domain folder** first. Escalate to `shared/`
  only once the third cross-domain reference appears.
- Use `brandedUuid('MyEntityId')` in domain folders to keep branding consistent:
  ```ts
  // invoice/invoice.entity.ts
  import { brandedUuid } from "@afenda/contracts";
  export const InvoiceIdSchema = brandedUuid("InvoiceId");
  ```

---

## Rule: `money.ts` — bigint minor units, no arithmetic

- `amountMinor` is `z.coerce.bigint()` — accepts `bigint` directly or numeric
  strings from JSON. No safe-integer ceiling.
- **Negative values are allowed** (credit memos, refunds).
- `currencyCode` must be ISO 4217 uppercase — the schema **rejects** lowercase; callers must normalise before parsing.
- **Rounding and FX conversion live in `@afenda/core`**, not here.
- **Locale-aware formatting** lives in `@afenda/ui/money`, not here or in core.

For JSON boundaries (API responses, event payloads, and message buses), prefer
`money-transport.ts` helpers:

- `stringifyWithMoney()` and `moneyJsonReplacer()` for bigint-safe serialization
- `parseWithMoney()` and `moneyJsonReviver()` for conservative deserialization
- validate deserialized money objects with `MoneySchema.parse(...)` before use

---

## Rule: `errors.ts` — scoped namespace required

All error codes follow `SCOPE_NOUN_REASON` screaming snake case.

| Prefix     | Domain                                         |
| ---------- | ---------------------------------------------- |
| `SHARED_*` | Infrastructure (auth, validation, idempotency) |
| `AP_*`     | Accounts payable / invoice workflow            |
| `IAM_*`    | Identity & access management                   |
| `GL_*`     | General ledger                                 |
| `SUP_*`    | Supplier management                            |
| `DOC_*`    | Document / evidence                            |

`ErrorCodeValues` is exported as `as const` so callers (DB check constraints,
`switch` statements, test fixtures) can import the list without pulling Zod.

Removing or renaming a code is a **breaking change** — deprecate for one major
version before removal.

---

## Rule: `events.ts` — versioning discipline

- `type` should be namespaced and stable (e.g. `"AP.INVOICE_SUBMITTED"`, `"COMM.DOCUMENT_PUBLISHED"`).
- `version` should be explicit and bumped for breaking payload changes.
- `occurredAt` must be UTC (`Z` suffix).
- `payload` must remain JSON-safe (no `Date`, `BigInt`, `Map`, class instances).
- Envelope contracts should stay forward-compatible where practical.

---

## Rule: `index.ts` — exports only

`shared/index.ts` must contain only `export * from "..."` lines.
No imports that execute code, no side effects, no logic.
Keep export order stable — reordering is a git-diff noise source.

---

## Does NOT Belong Here

- Domain-specific schemas (invoices, suppliers, GL accounts) → each domain's own dir
- Any import from another `@afenda/*` package
- Anything used by only one domain (without an approved escape-hatch comment)
- Zod schemas inside `headers.ts`
