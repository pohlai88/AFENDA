# core/infra — OWNERS

> **Package-wide rules (import boundaries, no-Zod, service function shape,
> domain vs infra separation) are inherited from the root
> [`packages/core/OWNERS.md`](../../OWNERS.md).
> This file covers only what is specific to the `infra/` directory.**

## Purpose

Cross-cutting infrastructure services used by every domain.

**Infra does NOT contain business rules.** If a function answers the question
"is this accounting rule satisfied?" it belongs in a domain directory, not here.

| ✅ Belongs                                         | ❌ Never here                          |
| -------------------------------------------------- | -------------------------------------- |
| Audit log appending                                | Invoice lifecycle rules                |
| Idempotency detection                              | SoD policy checks                      |
| Gap-free number generation                         | Money arithmetic                       |
| Typed environment parsing                          | Entity schemas (→ `@afenda/contracts`) |
| Future: rate-limiting, distributed tracing helpers | DB table DDL (→ `@afenda/db`)          |

### Hard Rule: Infra → Domain is Forbidden

Infrastructure must know nothing about invoices, postings, evidence, or org
business context. If infra needs a domain-specific type, that type must first
be lifted into `@afenda/contracts` so the dependency flows
`contracts ← infra`, never `domain ← infra`.

Domain → Infra imports are fine (e.g. `finance/` calls `infra/audit.ts`).

---

## File Conventions

| Pattern     | Purpose                                                     |
| ----------- | ----------------------------------------------------------- |
| `*.ts`      | Infrastructure service — one cross-cutting concern per file |
| `*.test.ts` | Colocated Vitest tests                                      |

---

## Files

| File               | Key exports                                                                                                                                                                                                                                                            | Notes                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audit.ts`         | `AuditEntryInput` (interface), `OrgScopedContext`, `writeAuditLog(db, ctx, entry)` → `AuditLogId`, `withAudit(db, ctx, entry, fn)` → `T`                                                                                                                               | Append-only: INSERT only — enforced by DB trigger. `orgId` always from `ctx.activeContext.orgId` (never caller-supplied). Runtime `assertJsonSafe()` + `redactSensitiveKeys()` before insert. `details` capped at 64 KB. Uses branded `AuditLogId`, typed `AuditAction` + `AuditEntityType` from contracts.                                                                                                       |
| `env.ts`           | `BaseEnvSchema`, `ApiEnvSchema`, `ApiEnv`, `WorkerEnvSchema`, `WorkerEnv`, `validateEnv(schema, env?)`, `redactEnv(env)`, `resolveWorkerDbUrl(env)`                                                                                                                    | **Only file in all of `@afenda/core` that imports `zod`** — this exception is documented in the root OWNERS.md. Fail-fast: process exits on invalid env. `nonEmpty()` rejects whitespace-only. `pgUrl` validates PostgreSQL scheme. `origins` parses CSV → `string[]`. Returns `Object.freeze()`-d config.                                                                                                        |
| `idempotency.ts`   | `IdempotencyBeginResult` (type), `CachedResponse`, `hashRequest(body)`, `beginIdempotency(db, params)`, `markDoneIdempotency(db, params)`, `releaseIdempotency(db, params)`, `cleanupExpiredIdempotency(db, now?)`, `IDEMPOTENCY_TTL_MS`, `IDEMPOTENCY_TTL_FINANCE_MS` | SHA-256 request fingerprint via `node:crypto`. Pending/done lifecycle: INSERT pending + ON CONFLICT DO NOTHING + SELECT existing. Four outcomes: `"new"`, `"duplicate"` (with cached response), `"in_progress"` (another handler active), `"mismatch"` (same key, different payload hash). `releaseIdempotency()` deletes pending row on handler failure. `cleanupExpiredIdempotency()` prunes past `expires_at`. |
| `numbering.ts`     | `nextNumber(db, orgId, entityType, options?)` → `string` (e.g. `"INV-2026-0042"`), `ensureSequence(db, params)`, `NextNumberOptions`                                                                                                                                   | Atomic `UPDATE…RETURNING` on `sequence` table. Consumed value computed in SQL as `(next_value - 1)::text` — no JS BigInt edge cases. Year-partitioned via `periodKey`. `ensureSequence()` is idempotent INSERT for org onboarding / fiscal year rollover. Uses `SequenceEntityType` closed set from contracts. ⚠️ Must run inside the same DB transaction as the domain write.                                    |
| `logger.ts`        | `logger` (singleton), `createLogger(name)` → child Logger                                                                                                                                                                                                              | Pino-based structured logging. Dev: pino-pretty colorized. Prod: JSON for log aggregation.                                                                                                                                                                                                                                                                                                                        |
| `audit-queries.ts` | `listAuditLogs(db, orgId, params)` → `CursorPage<AuditLogRow>`, `getAuditTrail(db, orgId, entityType, entityId)` → `AuditLogRow[]`                                                                                                                                     | Read-path audit queries. Cursor-paginated, filterable by entity/action/actor/date range. Follows invoice.queries.ts pattern.                                                                                                                                                                                                                                                                                      |
| `telemetry.ts`     | `bootstrapTelemetry(serviceName?)`                                                                                                                                                                                                                                     | Initialises OpenTelemetry NodeSDK with auto-instrumentations when `OTEL_ENABLED=true`. No-op otherwise. Dynamic imports — safe when OTel deps not installed.                                                                                                                                                                                                                                                      |
| `index.ts`         | Domain barrel — re-exports all files                                                                                                                                                                                                                                   | No logic.                                                                                                                                                                                                                                                                                                                                                                                                         |

---

## Special Rules

### `env.ts` — Zod Exception

`env.ts` is the sole file in `@afenda/core` permitted to `import { z } from "zod"`.
Every other file must import validated types from `@afenda/contracts` if it needs
schema-level parsing at runtime.

Rationale: environment validation is an infrastructure concern that must fail
fast at process startup, before any domain code runs.

### `numbering.ts` — Gap-Free Warning

`nextNumber()` consumes a monotonic sequence value via atomic SQL
(`UPDATE … RETURNING` takes a row lock under Read Committed).
The gap-free guarantee holds when the call runs inside the **same DB
transaction** as the domain mutation that uses the number:

- If the transaction commits → the number is permanently consumed.
- If the transaction rolls back → the number returns to the pool.
- If called outside a transaction (auto-commit) → gap-freedom is lost on any
  downstream failure.

Serializable isolation is NOT required for gap-freedom, but it may be used
globally for other invariants.

Every call site must document this constraint. Consider a lint rule in future.

### `idempotency.ts` — `node:crypto` Usage &amp; Lifecycle

This is the only file that imports `node:crypto` (for `createHash("sha256")`).
The import is permitted per the root OWNERS.md import rules. Do not spread
`node:crypto` usage to domain files — if another file needs hashing, route
through this module.

Lifecycle: `beginIdempotency()` inserts a `pending` row; the handler runs; then
`markDoneIdempotency()` transitions to `done` with the cached response. On
handler failure, `releaseIdempotency()` deletes the pending row so the client
can retry. `cleanupExpiredIdempotency()` prunes rows past their `expires_at`.

---

## DB Tables Accessed

| Table         | Operations                                                 | File             |
| ------------- | ---------------------------------------------------------- | ---------------- |
| `audit_log`   | `INSERT` only                                              | `audit.ts`       |
| `idempotency` | `INSERT`, `SELECT`, `UPDATE`, `DELETE`                     | `idempotency.ts` |
| `sequence`    | `INSERT` (ensureSequence), `UPDATE…RETURNING` (nextNumber) | `numbering.ts`   |

---

## Future Growth

- `rate-limit.ts` — per-org / per-principal rate limiting
- `tracing.ts` — distributed tracing correlation helpers
- `health.ts` — deep health check aggregation (DB, S3, queue)

## Does NOT Belong Here

- Accounting rules, money math, SoD checks → `finance/`
- Identity resolution, session management → `iam/`
- Document persistence, evidence linking → `document/`
- Entity / command schemas → `@afenda/contracts`
- DB table DDL → `@afenda/db`
- HTTP middleware → `apps/api`
