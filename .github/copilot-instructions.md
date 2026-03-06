# AFENDA — Copilot Instructions

This is a pnpm monorepo (Turborepo). Follow these rules strictly.

## Architecture — Import Direction Law

```
contracts  → zod only (no monorepo deps)
db         → drizzle-orm + pg + *Values from contracts
core       → contracts + db (THE ONLY JOIN POINT)
ui         → contracts only (no core, no db)
api        → contracts + core (never db)
web        → contracts + ui (never core, never db)
worker     → contracts + core + db
```

Violating these imports will cause CI failure.

## Schema-is-truth workflow

Every feature follows this exact order:
1. Zod schemas in `packages/contracts/src/<domain>/`
2. Drizzle pgTable in `packages/db/src/schema/`
3. SQL migration in `packages/db/drizzle/`
4. Domain service in `packages/core/src/<domain>/`
5. API route in `apps/api/src/routes/`
6. Worker handler in `apps/worker/src/jobs/`
7. UI in `apps/web/src/app/`
8. Tests + OWNERS.md updates

**Workflow automation:** Use the `afenda-scaffold-workflow` skill or invoke `@scaffold-guide` agent when adding new entities to get step-by-step guidance with automated progress tracking and gate verification.

## Hard rules

- **No `new Date()` in files importing drizzle or db** — use `sql\`now()\``
- **No floats for money** — use `bigint` minor units (cents)
- **All DB timestamps** — `timestamptz` (never `timestamp without time zone`)
- **Truth tables are append-only** — no UPDATE/DELETE on journal_entry, audit_log, outbox_event
- **Every command** must accept `idempotencyKey` and emit an outbox event
- **Every mutation** must write an audit log with `correlationId`
- **Tests go in `__vitest_test__/`** directories, never colocated with source
- **Barrel files < 60 lines** — split into submodule re-exports if growing
- **No `console.*`** — use Pino logger (`@afenda/core/infra/logger`)
- **No hardcoded colors** — use Tailwind design tokens

## Naming conventions

| Layer | Convention | Example |
| ----- | ---------- | ------- |
| DB columns | snake_case | `org_id` |
| TS / JSON | camelCase | `orgId` |
| Permissions | dot.scope | `ap.invoice.approve` |
| Error codes | UPPER_SNAKE | `AP_INVOICE_ALREADY_APPROVED` |

## Before every PR

```bash
pnpm typecheck && pnpm test && pnpm check:all
```

## Templates

See `templates/` for scaffold files when adding new entities/domains.

## Key files

- `PROJECT.md` — full architecture spec
- `tools/gates/` — CI enforcement scripts (10 gates)
- `packages/contracts/src/shared/errors.ts` — all error codes
- `packages/contracts/src/shared/audit.ts` — all audit actions
- `packages/contracts/src/shared/permissions.ts` — all permission keys
- `packages/contracts/src/shared/outbox.ts` — event envelope schema
