# apps/api — OWNERS

## Purpose

Fastify HTTP API server. Routes, middleware, and request/response handling.
Organized by ADR-0005 pillar structure under `routes/`.

## Import Rules

| May import          | Must NOT import |
| ------------------- | --------------- |
| `@afenda/contracts` | `@afenda/db`    |
| `@afenda/core`      | `@afenda/ui`    |
| `fastify`           | `react`, `next` |

## File Inventory

### Entry & types

| File | Description |
|---|---|
| `src/index.ts` | Server entry point — plugin registration order, listen, graceful shutdown |
| `src/types.ts` | Fastify type augmentations (`app.db`, `req.ctx`) |
| `src/otel-preload.ts` | OTel SDK bootstrap loaded via `--import` preload |

### Helpers

| File | Description |
|---|---|
| `src/helpers/responses.ts` | ERR codes, `makeSuccessSchema()`, `requireOrg`, `requireAuth` guards |

### Plugins

| File | Description |
|---|---|
| `src/plugins/auth.ts` | Bearer JWE / dev-mode `X-Dev-User-Email` auth |
| `src/plugins/db.ts` | Drizzle client decorator (`app.db`) |
| `src/plugins/idempotency.ts` | Dedup: preHandler claim → onSend cache → onError release |
| `src/plugins/otel.ts` | Stamps request context onto OTel HTTP spans |
| `src/plugins/swagger.ts` | OpenAPI 3.1 schema generation + Scalar docs UI |

> **Missing plugins (not yet implemented):** CORS, correlation-id injection,
> rate-limiting, and org-resolution are currently inlined in `src/index.ts`
> or handled by `@afenda/core`. Extract to plugins in Sprint 3.

### Routes (pillar-organized)

| File | Endpoints |
|---|---|
| `src/routes/erp/finance/ap.ts` | Invoice commands + queries |
| `src/routes/erp/finance/gl.ts` | GL commands + queries (journal entries, accounts, trial balance) |
| `src/routes/erp/finance/treasury.ts` | Treasury commands + queries (banking, reconciliation, cash position, liquidity forecast, variance, source feed) |
| `src/routes/erp/supplier.ts` | Supplier CRUD |
| `src/routes/kernel/audit.ts` | Audit log queries |
| `src/routes/kernel/capabilities.ts` | `GET /v1/capabilities/:entityKey` — RBAC capability check |
| `src/routes/kernel/evidence.ts` | Document presign + attach |
| `src/routes/kernel/identity.ts` | `GET /v1/me`, `GET /v1/me/contexts` |

### Services

| File | Description |
|---|---|
| `src/services/s3.ts` | AWS S3 presigned URL generation for evidence uploads |

### Tests (`src/__vitest_test__/`)

| File | What it tests |
|---|---|
| `global-setup.ts` | DB provisioning for integration test suite |
| `helpers/app-factory.ts` | Test Fastify instance factory |
| `helpers/factories.ts` | Seed helpers (org, principal, invoice) |
| `audit-completeness.test.ts` | Audit log created for every command |
| `audit-queries.test.ts` | Audit query filters and pagination |
| `cursor-pagination.test.ts` | Cursor-based pagination invariants |
| `idempotency.test.ts` | Duplicate request deduplication |
| `invoice-lifecycle.test.ts` | Full submit → approve → post → pay flow |
| `journal-balance.test.ts` | GL debit/credit balance invariant |
| `mark-paid.test.ts` | Mark-paid command + GL side-effect |
| `sequence-gap-free.test.ts` | Gap-free ID sequence guarantee |
| `sod-enforcement.test.ts` | Submitter cannot approve own invoice |
| `tx-atomicity.test.ts` | Rollback leaves no partial state |

## Belongs Here

- Fastify route handlers and plugins
- Request validation (using contracts schemas)
- Middleware (auth, rate-limit, correlation ID)
- Health/readiness endpoints
- Shared response helpers and route guards (`helpers/`)

## Does NOT Belong Here

- Direct DB queries (→ use `@afenda/core` services instead)
- Zod schema definitions for domain entities/commands (→ `@afenda/contracts`)
- Background job processing (→ `apps/worker`)

> **Note:** API-layer response schemas (presign data, health responses) and
> inline Zod schemas for route `body`/`response` options ARE allowed here.
> Only _domain_ schemas (entities, commands) must live in `@afenda/contracts`.
