# AFENDA — Architecture & Developer Guide

> **Business Truth Engine** — Every financial fact is reproducible, auditable, explainable.

| Field   | Value                                      |
| ------- | ------------------------------------------ |
| Version | **1.0**                                    |
| Date    | 2026-03-06                                 |
| Status  | Sprint 2 complete (backend), Sprint 3 next |

---

## Table of Contents

1. [Vision](#1--vision)
2. [Directory Map](#2--directory-map)
3. [Architecture Principles](#3--architecture-principles)
4. [Import Direction Law](#4--import-direction-law)
5. [System Architecture](#5--system-architecture)
6. [Data Contracts](#6--data-contracts)
7. [Security Model](#7--security-model)
8. [Money & Timestamp Model](#8--money--timestamp-model)
9. [Reliability](#9--reliability)
10. [Observability](#10--observability)
11. [CI Gates & Enforcement](#11--ci-gates--enforcement)
12. [Developer Guardrails](#12--developer-guardrails)
13. [Naming Conventions](#13--naming-conventions)
14. [Testing Strategy](#14--testing-strategy)
15. [Tech Stack Lock](#15--tech-stack-lock)
16. [Local Development](#16--local-development)
17. [Deployment Targets](#17--deployment-targets)
18. [New Code Workflow](#18--new-code-workflow-schema-is-truth)
19. [Sprint Roadmap](#19--sprint-roadmap)
20. [ADR Index](#20--adr-index)
21. [Deliberately Omitted](#21--deliberately-omitted)

---

## 1 — Vision

We are **not building features**. We are building **Truth**.

- UI is a **projection** of truth
- Workflows are **operators** on truth
- Integrations are **adapters** to/from truth
- Every financial fact is **reproducible, auditable, explainable**

### Scope (Day-1 thin slice)

| Domain       | What ships                                                     |
| ------------ | -------------------------------------------------------------- |
| AP (Invoices) | Submit → Approve → Post → Pay lifecycle, SoD enforcement      |
| GL           | Double-entry journal posting, reversal, trial balance          |
| Evidence     | S3 document upload + linking to invoices/GL entries            |
| IAM          | Party/Principal model, RBAC, multi-org isolation, context switching |
| Audit        | Append-only log, queryable by entity/action/date/actor        |
| Observability | OTel auto-tracing, Jaeger, insight factory                    |

### Explicit non-goals

Full procurement, HR, manufacturing, consolidation, complex BPMN, multi-region active-active, 3-way match (PO/GRN/Invoice), multi-currency posting, period close.

---

## 2 — Directory Map

```
afenda-nexus/
│
├── apps/                          # Deployable applications
│   ├── api/                       # Fastify command + query API (:3001)
│   │   └── src/
│   │       ├── index.ts           # Server entry + plugin registration order
│   │       ├── types.ts           # Fastify type augmentations (app.db, req.ctx)
│   │       ├── otel-preload.ts    # OTel SDK bootstrap (--import preload)
│   │       ├── helpers/           # Response builders, auth guards
│   │       │   └── responses.ts   # ERR codes, makeSuccessSchema(), requireOrg/Auth
│   │       ├── plugins/           # Fastify lifecycle hooks
│   │       │   ├── db.ts          # Drizzle client decorator
│   │       │   ├── swagger.ts     # OpenAPI 3.1 + Scalar docs
│   │       │   ├── auth.ts        # Bearer JWE / dev-mode auth
│   │       │   ├── idempotency.ts # Dedup: preHandler claim → onSend cache
│   │       │   ├── otel.ts        # Request context → OTel attributes
│   │       │   └── ...            # CORS, correlation-id, rate-limit, org-resolution
│   │       ├── routes/            # One file per domain (invoices, gl, evidence, iam, audit)
│   │       ├── services/          # S3 presigned URL service
│   │       └── __vitest_test__/   # Integration tests (real Postgres)
│   │
│   ├── web/                       # Next.js 16 frontend (:3000)
│   │   └── src/
│   │       ├── app/               # App Router pages
│   │       │   ├── layout.tsx     # Root layout + Suspense
│   │       │   ├── page.tsx       # Dashboard
│   │       │   ├── admin/         # Admin console, traces, insights
│   │       │   ├── auth/          # Login/logout flows
│   │       │   ├── finance/       # Invoice + GL views
│   │       │   └── api/internal/  # Next.js route handlers
│   │       └── lib/               # Auth config, utilities
│   │
│   ├── worker/                    # Graphile Worker (LISTEN/NOTIFY)
│   │   └── src/
│   │       ├── index.ts           # Task registry, env validation, graceful shutdown
│   │       └── jobs/              # Event handlers (8 tasks)
│   │           ├── process-outbox-event.ts   # Dispatcher (routes on event.type)
│   │           ├── handle-invoice-submitted.ts
│   │           ├── handle-invoice-approved.ts
│   │           ├── handle-invoice-rejected.ts
│   │           ├── handle-invoice-voided.ts  # Auto-reverses GL entries
│   │           ├── handle-invoice-paid.ts
│   │           ├── handle-journal-posted.ts
│   │           └── handle-journal-reversed.ts
│   │
│   └── workflows/                 # Trigger.dev + React Flow (Sprint 4+, see ADR-0004)
│
├── packages/                      # Shared libraries (strict dependency rules)
│   ├── contracts/                 # Pure Zod schemas — NO monorepo deps
│   │   └── src/
│   │       ├── index.ts           # Barrel re-export only (<60 lines)
│   │       ├── shared/            # Primitives: IDs, money, errors, pagination, outbox, audit
│   │       ├── iam/               # Party, principal, membership, role schemas
│   │       ├── invoice/           # Invoice entity + command schemas
│   │       ├── gl/                # Account, journal line, GL commands
│   │       ├── supplier/          # Supplier entity + commands
│   │       ├── evidence/          # Document + attachment schemas
│   │       └── meta/              # UI metadata (entity/field/view/action/flow defs)
│   │
│   ├── core/                      # Domain logic — ONLY package that joins contracts + db
│   │   └── src/
│   │       ├── index.ts           # Barrel
│   │       ├── iam/               # Auth resolution, org lookup, permissions
│   │       ├── finance/           # Money arithmetic, posting invariants, SoD
│   │       │   ├── money.ts       # SafeMoney (bigint, no floats)
│   │       │   ├── posting.ts     # Journal balance checking
│   │       │   ├── sod.ts         # Separation of duties
│   │       │   ├── ap/            # Invoice service + queries (state machine)
│   │       │   └── gl/            # GL posting + queries (journal entries)
│   │       ├── document/          # Evidence registry, linking, policies
│   │       ├── infra/             # Cross-cutting: audit, idempotency, numbering, logger, env
│   │       │   ├── telemetry.ts   # OTel SDK bootstrap
│   │       │   ├── tracing.ts     # instrumentService() auto-wrapper
│   │       │   └── otel-insights.ts  # 6-analyzer insight factory
│   │       └── policy/            # Capability engine + entity resolvers
│   │
│   ├── db/                        # Drizzle DDL — deterministic, no business logic
│   │   ├── drizzle.config.ts
│   │   ├── drizzle/               # SQL migrations (append-only)
│   │   └── src/
│   │       ├── client.ts          # Pooler vs direct URL, strict SSL
│   │       ├── migrate.ts         # Advisory lock, idempotent
│   │       ├── seed.ts            # ON CONFLICT DO NOTHING, re-runnable
│   │       └── schema/            # 24 tables across 5 domain files
│   │           ├── iam.ts         # 10 tables (party model, RBAC)
│   │           ├── finance.ts     # 5 tables (account, invoice, journal)
│   │           ├── supplier.ts    # 1 table
│   │           ├── document.ts    # 3 tables (document, evidence, ops)
│   │           ├── infra.ts       # 5 tables (outbox, idempotency, audit, sequence, DLQ)
│   │           └── index.ts       # Barrel
│   │
│   ├── ui/                        # Design system (shadcn/ui + Tailwind)
│   │   └── src/
│   │       ├── components/        # shadcn/ui components (Button, Badge, Card, ...)
│   │       ├── field-kit/         # Metadata-driven form + list renderers
│   │       ├── meta/              # Entity metadata registry
│   │       ├── generated/         # Auto-generated from metadata
│   │       ├── lib/               # cn() utility
│   │       └── money.ts           # formatMoney() locale-aware display
│   │
│   └── tsconfig/                  # Shared TypeScript config
│
├── tools/                         # CI gates + shared utilities
│   ├── run-gates.mjs              # Unified runner — all gates, single exit code
│   ├── gates/                     # One script per concern (10 gates)
│   │   ├── boundaries.mjs         # Import direction law
│   │   ├── catalog.mjs            # pnpm catalog version hygiene
│   │   ├── test-location.mjs      # Tests → __vitest_test__/, never colocated
│   │   ├── schema-invariants.mjs  # Org-scoped unique, FK indexes, updatedAt
│   │   ├── migration-lint.mjs     # SQL safety (no DROP TABLE, NOT NULL → DEFAULT)
│   │   ├── contract-db-sync.mjs   # Zod ↔ pgTable column parity (10 pairs)
│   │   ├── server-clock.mjs       # Ban new Date() in DB code
│   │   ├── owners-lint.mjs        # OWNERS.md ↔ filesystem parity
│   │   ├── token-compliance.mjs   # No hardcoded Tailwind palette tokens
│   │   └── ui-meta.mjs            # Metadata registry completeness
│   ├── lib/                       # Shared utilities for gates
│   │   ├── ansi.mjs               # Terminal colors
│   │   ├── walk.mjs               # Recursive TS file discovery
│   │   ├── imports.mjs            # Import statement parsing
│   │   ├── workspace.mjs          # pnpm workspace loader
│   │   └── reporter.mjs           # Violation reporting + summary
│   └── eslint/
│       └── no-hardcoded-colors.mjs  # ESLint rule: enforce design tokens
│
├── docs/
│   └── adr/                       # Architecture Decision Records
│       ├── 0003-identity-model-redesign.md  # Party + Principal + Membership
│       └── 0004-workflow-engine.md          # Trigger.dev + React Flow (replaces n8n)
│
├── .github/
│   ├── workflows/ci.yml           # PR checks: lint, typecheck, gates, test
│   ├── pull_request_template.md   # PR checklist
│   └── ISSUE_TEMPLATE/            # Bug, feature, ADR templates
│
├── docker-compose.dev.yml         # Postgres 17 + Jaeger v2 + MinIO
├── turbo.json                     # Turborepo task pipeline
├── pnpm-workspace.yaml            # Workspace packages + version catalog (43 entries)
├── tsconfig.base.json             # Shared compiler options
├── vitest.workspace.ts            # All test projects
├── eslint.config.js               # Flat config + custom rules
├── .editorconfig                  # Formatting: 2 spaces, UTF-8, LF
├── .env.example                   # Required env vars template
└── PROJECT.md                     # ← This file
```

### OWNERS.md governance

Every package and subdirectory contains an `OWNERS.md` with:

1. **Purpose** — what belongs in this directory
2. **Import Rules** — `May import` / `Must NOT import` table
3. **Files** — inventory of every `.ts` file with description
4. **PR Checklist** — pre-merge review items

The `owners-lint` gate validates that the Files table matches the actual filesystem. Phantom or unlisted files cause CI failure.

---

## 3 — Architecture Principles

### A — Truth core in code; automation at edges

Core truth (posting, approvals, SoD, audit) is deterministic code with tests.
Workflow engine handles edges only: email, Slack, connectors, scheduled syncs.

### B — Event-first inside; workflow-first outside

- Inside: command → outbox → worker → projections
- Outside: workflow engine consumes webhooks/events

### C — No magic customization

Every extension must pass through: versioned API contracts, event contracts, migration discipline, capability registry.

### D — Schema is truth

The implementation order for any feature is fixed:

```
contracts → db schema → migration → core service → API route → UI → tests
```

Breaking this order creates drift. CI gates enforce it.

---

## 4 — Import Direction Law

```
┌─────────────┐
│  contracts   │ ← zod only (no monorepo deps)
└──────┬───┬──┘
       │   │
       │   └──────────────────────────┐
       ▼                              ▼
┌──────────┐                   ┌──────────┐
│    db    │ ← drizzle + pg    │    ui    │ ← react + tailwind
│          │   + *Values only  │          │   NO core, NO db
└──────┬───┘                   └──────────┘
       │
       ▼
┌──────────┐
│   core   │ ← contracts + db (THE ONLY JOIN POINT)
└──────┬───┘
       │
  ┌────┴────┐
  ▼         ▼
┌─────┐  ┌────────┐
│ api │  │ worker │ ← contracts + core (api: never db; worker: + db)
└─────┘  └────────┘
  │
  ▼
┌─────┐
│ web │ ← contracts + ui (never core, never db)
└─────┘
```

**Hard rules:**

| Package    | May import                              | Must NOT import               |
| ---------- | --------------------------------------- | ----------------------------- |
| contracts  | `zod`                                   | any `@afenda/*`, drizzle, pg  |
| db         | `drizzle-orm`, `pg`, `*Values` from contracts | `zod`, `@afenda/core`, `@afenda/ui` |
| core       | `@afenda/contracts`, `@afenda/db`       | `@afenda/ui`, fastify, react  |
| ui         | `@afenda/contracts`                     | `@afenda/core`, `@afenda/db`  |
| api        | `@afenda/contracts`, `@afenda/core`     | `@afenda/db`, `@afenda/ui`    |
| web        | `@afenda/contracts`, `@afenda/ui`       | `@afenda/core`, `@afenda/db`  |
| worker     | `@afenda/contracts`, `@afenda/core`, `@afenda/db` | `@afenda/ui`          |

Enforced by: `pnpm check:boundaries` → CI failure on violation.

**Additional hard rules:**

- No barrel file > 60 lines
- No Zod inside `@afenda/db`
- No drizzle-orm inside `@afenda/contracts`
- No `new Date()` in files importing drizzle or db (use `sql\`now()\``)

---

## 5 — System Architecture

```mermaid
flowchart LR
  U[Users] --> WEB[Next.js :3000]
  WEB --> API[Fastify :3001]
  API --> DB[(Postgres / Neon)]
  API --> OUTBOX[(Outbox Events)]
  OUTBOX --> WORKER[Graphile Worker]
  WORKER --> DB
  WORKER --> WF[Workflow Engine — Sprint 4+]
  WF --> EXT[Email / Slack / Bank APIs]
```

### Component responsibilities

| Component | Role | Key constraint |
| --------- | ---- | -------------- |
| **Web** | UI reads projections, sends commands via API | Never invents truth |
| **API** | Command API (writes) + Query API (reads) | Rate-limited, idempotent commands |
| **DB** | Truth tables + projection tables | org_id on every table |
| **Worker** | Async event processing (LISTEN/NOTIFY) | All handlers idempotent |

### API endpoints (summary)

| Group | Endpoints |
| ----- | --------- |
| Infra | `GET /healthz`, `GET /readyz` |
| IAM | `GET /v1/me`, `GET /v1/me/contexts`, `GET /v1/capabilities/:entityKey` |
| Audit | `GET /v1/audit-logs`, `GET /v1/audit-logs/:entityType/:entityId` |
| Invoice commands | `POST /v1/commands/{submit,approve,reject,void}-invoice`, `POST /v1/commands/mark-paid` |
| Invoice queries | `GET /v1/invoices`, `GET /v1/invoices/:id`, `GET /v1/invoices/:id/history` |
| GL commands | `POST /v1/commands/post-to-gl`, `POST /v1/commands/reverse-entry` |
| GL queries | `GET /v1/journal-entries`, `GET /v1/journal-entries/:id`, `GET /v1/accounts`, `GET /v1/trial-balance` |
| Evidence | `POST /v1/evidence/presign`, `POST /v1/documents`, `POST /v1/commands/attach-evidence` |
| Docs | `GET /v1/docs` (Scalar UI), `GET /v1/docs/openapi.json` |

---

## 6 — Data Contracts

### Command contract

- Must include `idempotencyKey` (client-supplied UUID)
- Must include `correlationId` (header or generated)
- Server stamps `actorPrincipalId` from session (never trusted from payload)

### Event contract (outbox)

- `type`, `version`, `orgId`, `correlationId`, `occurredAt`, `payload`
- Events are immutable once written

### Query contract

- Returns projection DTOs in camelCase
- **Cursor-based pagination** (not offset): `{ data: T[], cursor: string | null, hasMore: boolean }`

### Error contract (Stripe-inspired)

```json
{
  "error": { "code": "AP_INVOICE_ALREADY_APPROVED", "message": "...", "details": {} },
  "correlationId": "uuid"
}
```

HTTP codes: 400 (validation), 401 (unauth), 403 (forbidden + "why denied"), 404, 409 (conflict/idempotency), 422 (domain rule), 500.

### Error codes (28 total, pattern: `SCOPE_NOUN_REASON`)

Defined in `packages/contracts/src/shared/errors.ts`. Prefixes: `SHARED_*`, `AP_*`, `GL_*`, `SUP_*`, `DOC_*`, `IAM_*`.

---

## 7 — Security Model

### Authentication

**NextAuth v4** (JWT strategy). API validates tokens via `jose` + HKDF key derivation from `NEXTAUTH_SECRET`.

- Dev mode: `X-Dev-User-Email` header → resolves full context
- Prod: `Authorization: Bearer <NextAuth JWE>`

### Organization resolution

1. Subdomain: `{org}.afenda.app`
2. Header fallback (internal): `x-org-id`
3. Never from body payloads

### Authorization (RBAC + SoD)

Permission format: `scope.entity.action` (e.g., `ap.invoice.approve`, `gl.journal.post`)

All 20 permission keys defined in: `packages/contracts/src/shared/` + DB seed.

SoD policies live in `packages/core/src/finance/sod.ts`:
- `canApproveInvoice()` — submitter cannot approve their own invoice
- `canMarkPaid()` — requires `ap.invoice.markpaid` permission

### Rate limiting

| Scope | Limit |
| ----- | ----- |
| Unauthenticated (IP) | 100 req/min |
| Authenticated (principalId) | 300 req/min |
| Commands (writes) | 30 req/min |
| Presigned URL generation | 10 req/min |

---

## 8 — Money & Timestamp Model

### Money: no floats, ever

- `amount_minor: bigint` (cents/pips)
- `currency_code: string` (ISO 4217)
- All arithmetic in `core/finance/money.ts` (SafeMoney type)

### Posting invariant

Every journal entry: `Σ debits == Σ credits`. All posting ops are atomic DB transactions inside `packages/core` (never in route handlers).

### Timestamps

- All DB columns: `timestamptz` (never `timestamp without time zone`)
- API responses: ISO 8601 with `Z` suffix
- Display: converted to user timezone in UI only

### Immutability policy (truth tables)

**No UPDATEs. No DELETEs.** Applies to: `journal_entry`, `journal_line`, `audit_log`, `outbox_event`.

Corrections via **reversal entries** (new journal entry offsetting original). Status changes via **new rows in status history table**.

---

## 9 — Reliability

### Command idempotency

Every command accepts `idempotencyKey`. Duplicates return the original result.

- Wire: `Idempotency-Key` header (canonical) or body field
- Storage: `idempotency_lock` table (unique on `org_id + request_hash`)
- Fastify plugin: preHandler claim → onSend cache → onError release

### Worker retries + DLQ

- Exponential backoff (configurable max retries)
- Failed jobs → `dead_letter_job` table (manual review)
- Every handler idempotent (safe re-execution)

---

## 10 — Observability

### Correlation ID

Every request gets a `correlationId` (generated if absent). Propagated: API → outbox → worker → external calls.

### OpenTelemetry

- `core/infra/telemetry.ts` — SDK bootstrap with `OTEL_ENABLED` guard
- `core/infra/tracing.ts` — `instrumentService(namespace, fns)` auto-wraps service modules
- `api/plugins/otel.ts` — stamps request context on HTTP spans
- Auto-extracted attributes: `afenda.org.id`, `afenda.principal.id`, `afenda.correlation.id`

### Insight Factory (6 analyzers)

`core/infra/otel-insights.ts` reads Jaeger traces and produces:
1. Slow operations (P95 latency + regression)
2. Error hotspots (per-route error rates)
3. Security signals (SoD violations, 403 patterns)
4. Reliability (idempotency replays, N+1 detection)
5. Throughput distribution
6. Data quality (attribute coverage)

Dashboard: `/admin/insights`. API: `/api/internal/insights`.

### Health checks

- `GET /healthz` — process alive
- `GET /readyz` — DB connection + migration currency

---

## 11 — CI Gates & Enforcement

All enforced by `pnpm check:all` (unified runner: `tools/run-gates.mjs`).

| # | Gate | Command | What it checks |
| - | ---- | ------- | -------------- |
| 1 | **Import boundaries** | `pnpm check:boundaries` | Package dependency direction (§4) |
| 2 | **Catalog hygiene** | `pnpm check:catalog` | ≥2 packages sharing dep → must use `catalog:` |
| 3 | **Test location** | `pnpm check:test-location` | Tests in `__vitest_test__/`, never colocated |
| 4 | **Schema invariants** | `pnpm check:schema-invariants` | Org-scoped unique, FK indexes, updatedAt on mutables |
| 5 | **Migration lint** | `pnpm check:migration-lint` | No DROP TABLE, NOT NULL requires DEFAULT |
| 6 | **Contract↔DB sync** | `pnpm check:contract-db-sync` | Zod schema ↔ Drizzle column parity (10 entity pairs) |
| 7 | **Server clock** | `pnpm check:server-clock` | Ban `new Date()` in DB-touching code |
| 8 | **OWNERS lint** | `pnpm check:owners-lint` | OWNERS.md Files table ↔ filesystem parity |
| 9 | **Token compliance** | `pnpm check:token-compliance` | No hardcoded color values in TSX/CSS |
| 10 | **UI metadata** | `pnpm check:ui-meta` | Metadata registry completeness |

### Gate addition protocol

When adding a new gate:
1. Create `tools/gates/<name>.mjs`
2. Add entry to `GATES` array in `tools/run-gates.mjs`
3. Add `"check:<name>": "node tools/gates/<name>.mjs"` to root `package.json`
4. Document in this table

---

## 12 — Developer Guardrails

These prevent drift from architecture decisions. They are not suggestions — they are enforced.

### 12.1 — Hard rules (CI-enforced)

| Rule | Enforced by | Error on violation |
| ---- | ----------- | ------------------ |
| Import direction (§4) | `boundaries.mjs` gate | Exit 1 |
| Version catalog parity | `catalog.mjs` gate | Exit 1 |
| Test file placement | `test-location.mjs` gate | Exit 1 |
| Schema invariants (timestamps, FK indexes) | `schema-invariants.mjs` gate | Exit 1 |
| Migration safety | `migration-lint.mjs` gate | Exit 1 |
| Contract↔DB column parity | `contract-db-sync.mjs` gate | Exit 1 |
| No `new Date()` in DB code | `server-clock.mjs` gate | Exit 1 |
| OWNERS.md ↔ filesystem | `owners-lint.mjs` gate | Exit 1 |
| No hardcoded colors in TSX | `no-hardcoded-colors` ESLint rule | ESLint error |
| Design token compliance | `token-compliance.mjs` gate | Exit 1 |
| UI metadata completeness | `ui-meta.mjs` gate | Exit 1 |
| No `console.*` (use Pino) | ESLint `no-console` | ESLint warn |
| Consistent type-only imports | ESLint rule | ESLint warn |

### 12.2 — Structural rules (OWNERS.md-enforced)

| Rule | Where documented |
| ---- | ---------------- |
| `@afenda/db` may only import `*Values` from contracts | `packages/db/OWNERS.md` |
| `@afenda/core` is the ONLY join point for contracts + db | `packages/core/OWNERS.md` |
| Barrel files < 60 lines | §4 (manual review) |
| No raw SQL in core (Drizzle operators only) | `packages/core/OWNERS.md` |
| Service functions return `ServiceResult<T>` | `core/finance/*/OWNERS.md` |

### 12.3 — PR checklist (template-enforced)

Every PR must confirm: OWNERS.md updated, gates passed, tests added, contracts-first ordering followed. See `.github/pull_request_template.md`.

### 12.4 — Adding a new domain entity (checklist)

When adding a new entity (e.g., `purchase-order`), follow this exact order:

```
1. packages/contracts/src/<domain>/<entity>.entity.ts   — Zod schema
2. packages/contracts/src/<domain>/<entity>.commands.ts  — Command schemas
3. packages/contracts/src/index.ts                       — Add to barrel
4. packages/db/src/schema/<domain>.ts                    — Drizzle pgTable
5. packages/db/src/schema/index.ts                       — Add to barrel
6. drizzle/NNNN_<name>.sql                               — Migration
7. packages/core/src/<domain>/<entity>.service.ts        — Service (state machine, SoD, outbox)
8. packages/core/src/<domain>/<entity>.queries.ts        — Query functions
9. packages/core/src/<domain>/index.ts                   — Barrel + instrumentService()
10. apps/api/src/routes/<entity>.ts                      — API routes (Zod type provider)
11. apps/worker/src/jobs/handle-<event>.ts               — Event handlers
12. apps/worker/src/index.ts                             — Register in task list
13. packages/contracts/src/shared/errors.ts              — Add error codes
14. packages/contracts/src/shared/audit.ts               — Add audit actions
15. packages/contracts/src/shared/outbox.ts              — Add event types
16. OWNERS.md files                                      — Update in affected packages
17. tools/gates/contract-db-sync.mjs                     — Add to ENTITY_PAIRS
18. Tests (unit in core, integration in api)
```

**Missing any step → CI gate failure.**

---

## 13 — Naming Conventions

| Layer                 | Convention | Example              |
| --------------------- | ---------- | -------------------- |
| DB columns            | snake_case | `org_id`, `paid_at`  |
| TS / JSON / contracts | camelCase  | `orgId`, `paidAt`    |
| DB tables             | snake_case | `journal_entry`      |
| Permissions           | dot.scope  | `ap.invoice.approve` |
| Error codes           | UPPER_SNAKE | `AP_INVOICE_ALREADY_APPROVED` |
| Audit actions         | dot.verb   | `invoice.submitted`  |
| Sequence prefixes     | UPPER-YEAR | `INV-2026`, `JE-2026` |
| OTel span names       | namespace.snake | `ap.submit_invoice` |
| API route paths       | kebab-case | `/v1/commands/submit-invoice` |
| File names            | kebab-case | `invoice.service.ts`, `posting.service.ts` |

Mapping between DB (snake) and TS (camel) occurs **only at the db/repository boundary**. Handlers and UI never reference snake_case.

---

## 14 — Testing Strategy

| Layer | What it tests | Location | Runner |
| ----- | ------------- | -------- | ------ |
| Unit tests | Domain invariants (debits=credits, SoD, money) | `packages/core/__vitest_test__/` | `vitest run` |
| Contract tests | Zod schema parity | `packages/contracts/__vitest_test__/` | `vitest run` |
| DB schema tests | Schema invariants | `packages/db/__vitest_test__/` | `vitest run` |
| Integration tests | API → DB on real Postgres | `apps/api/src/__vitest_test__/` | `vitest run` (global-setup provisions DB) |
| E2E tests | Full browser flow | `apps/web/e2e/` | Playwright |

**Test location rule:** `.test.ts` files go in `__vitest_test__/` directories, never colocated with source. Enforced by `test-location.mjs` gate.

**Coverage:** Posting + approval invariants require near-complete coverage.

Current counts: 176 tests (154 unit + 22 integration), all passing.

---

## 15 — Tech Stack Lock

### Runtime

| Package | Version | Role |
| ------- | ------- | ---- |
| Node.js | 24 LTS | Runtime |
| pnpm | 10.30.3 | Package manager |
| Turborepo | 2.8.12 | Monorepo orchestration |
| TypeScript | 5.9.3 | Language |

### Frontend

| Package | Version |
| ------- | ------- |
| Next.js | 16.1.6 |
| React | 19.2.4 |
| Tailwind CSS | 4.2.1 |

### Backend

| Package | Version |
| ------- | ------- |
| Fastify | 5.7.4 |
| Zod | 4.3.6 |
| Drizzle ORM | 0.45.1 |
| Graphile Worker | 0.16.6 |
| Pino | 10.3.1 |

### Infrastructure

| Package | Version |
| ------- | ------- |
| PostgreSQL | 17 |
| Jaeger | v2 (latest) |
| @aws-sdk/client-s3 | 3.750.0 |
| next-auth | 4.24.13 |

### Observability

| Package | Version |
| ------- | ------- |
| @opentelemetry/api | 1.9.0 |
| @opentelemetry/sdk-node | 0.212.0 |

### Testing

| Package | Version |
| ------- | ------- |
| Vitest | 4.0.18 |
| Playwright | (catalog) |

All versions pinned in `pnpm-workspace.yaml` catalog. CI enforces `"catalog:"` usage.

---

## 16 — Local Development

### Prerequisites

- Node.js 24, pnpm 10, Docker

### Bootstrap

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d    # Postgres :5433, Jaeger :16686, MinIO :9000
pnpm db:migrate
pnpm db:seed                                       # Demo org, admin, RBAC, CoA, supplier
pnpm dev                                           # web :3000, api :3001
```

### Services

| Service | Port | URL |
| ------- | ---- | --- |
| Web | 3000 | http://localhost:3000 |
| API | 3001 | http://localhost:3001/v1/docs |
| Postgres | 5433 | postgresql://afenda:afenda@localhost:5433/afenda_dev |
| Jaeger | 16686 | http://localhost:16686 |
| MinIO Console | 9001 | http://localhost:9001 |

### Verify

```bash
pnpm typecheck           # All packages type-check
pnpm test                # All unit + integration tests
pnpm check:all           # All 10 CI gates
pnpm build               # Full build
```

---

## 17 — Deployment Targets

| Component | Target | Notes |
| --------- | ------ | ----- |
| Web | Vercel | Zero-config SSR, preview deploys |
| API | Railway / Fly.io | Long-running process (not serverless) |
| Worker | Railway / Fly.io | Persistent process, LISTEN/NOTIFY |
| Postgres | Neon | Serverless Postgres (pooler for API, direct for worker) |
| Object storage | Cloudflare R2 / AWS S3 | Evidence documents |
| Jaeger | Docker on Railway / Fly.io | Trace collector + UI |

---

## 18 — New Code Workflow (Schema Is Truth)

Every feature follows this implementation order. Skipping steps causes CI gate failure.

```
┌───────────────┐
│ 1. Contracts  │  Zod schemas (entity, commands, error codes, audit actions)
└───────┬───────┘
        ▼
┌───────────────┐
│ 2. DB Schema  │  Drizzle pgTable + SQL migration
└───────┬───────┘
        ▼
┌───────────────┐
│ 3. Core       │  Domain service (state machine, SoD, outbox events)
└───────┬───────┘
        ▼
┌───────────────┐
│ 4. API Route  │  Fastify route (Zod type provider, OpenAPI auto-gen)
└───────┬───────┘
        ▼
┌───────────────┐
│ 5. Worker     │  Event handler (idempotent)
└───────┬───────┘
        ▼
┌───────────────┐
│ 6. UI         │  Next.js page (reads projections via API)
└───────┬───────┘
        ▼
┌───────────────┐
│ 7. Tests      │  Unit (core) + integration (api) + OWNERS.md update
└───────────────┘
```

### Before every PR

```bash
pnpm typecheck && pnpm test && pnpm check:all
```

---

## 19 — Sprint Roadmap

### Sprint 0 — Foundation ✅

Auth, RBAC, evidence storage, money model, sequence numbering, outbox, idempotency, health checks, rate limiting, 14/14 items complete.

### Sprint 1 — Truth Slice ✅

Invoice lifecycle (submit → approve → reject → void → post → pay), GL posting + reversal, cursor pagination, 9/9 items complete. Exit criteria verified by 12 integration tests.

### Sprint 2 — Operational Slice ✅ (backend)

Audit log queries, mark-paid command, OTel SDK + auto-instrumentation + insight factory, 10 CI gates, 22 integration tests.

### Sprint 3 — UI Slice (next)

| # | Item | Status |
| - | ---- | ------ |
| 3.1 | Supplier portal: invoice submission UI | ❌ |
| 3.2 | AP approval screen + ledger view | ❌ |
| 3.3 | Audit log viewer UI | ❌ |
| 3.4 | Dashboard + trial balance visualization | ❌ |
| 3.5 | Auth sign-in flow + session management | ❌ |
| 3.6 | Design system + component library (shadcn/ui) | ❌ |

### Sprint 4+ — Workflow Engine (ADR-0004)

Trigger.dev v3 + React Flow visual builder. See `docs/adr/0004-workflow-engine.md`.

---

## 20 — ADR Index

| # | Title | Status | File |
| - | ----- | ------ | ---- |
| 0003 | Identity Model Redesign (Party + Principal + Membership) | Accepted (complete) | `docs/adr/0003-identity-model-redesign.md` |
| 0004 | Workflow Engine (Trigger.dev + React Flow replaces n8n) | Accepted (Sprint 4+) | `docs/adr/0004-workflow-engine.md` |

---

## 21 — Deliberately Omitted

These are intentionally not in scope to keep Day-1 executable:

1. OCR / invoice data extraction — store raw; OCR as worker task later
2. 3-way match (PO/GRN/Invoice) — design hooks only (`poReference`)
3. Bank reconciliation — manual status first; bank import later
4. Delegated approvals / OOO routing — post-Day-1
5. Full RLS — org-aware schema Day-1; RLS enforcement later
6. Multi-currency posting — single functional currency first
7. Period close / fiscal calendar — post-Day-1
8. CoA hierarchy — flat chart Day-1; parent/child tree later
9. PDF invoice rendering — raw data now; PDF worker task later
10. Email transactional service — worker jobs first; Resend/SES later
11. Full-text search — Postgres `tsvector` sufficient Day-1
12. Caching layer (Redis) — projections from Postgres Day-1
13. Malware scanning — store documents; scan pipeline later

---

_This document is the single source of project intent. All implementation decisions trace back to a section here. Do not create satellite docs that contradict it._
