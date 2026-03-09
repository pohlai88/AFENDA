# AFENDA — Copilot Instructions

> **Quick reference:** See [AGENTS.md](../AGENTS.md) for comprehensive AI agent guide

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

## Architecture — Pillar Structure (ADR-0005)

Every layer package is organised into four pillars:

| Pillar | Purpose | Example modules |
| ------ | ------- | --------------- |
| `shared` | Cross-cutting types & utilities (contracts only) | `ids`, `errors`, `money`, `permissions` |
| `kernel` | Organisation-scoped governance, identity, execution | `governance/audit`, `identity`, `execution/outbox` |
| `erp` | Transactional AP/AR/GL domain logic | `finance/ap`, `finance/gl`, `supplier` |
| `comm` | Communication & notifications | `notification` |

New files must be placed under `<pillar>/<module>/` within each layer. The `module-boundaries` CI gate enforces this — violations fail CI.

## Schema-is-truth workflow

Every feature follows this exact order:
1. Zod schemas in `packages/contracts/src/<pillar>/<module>/`
2. Drizzle pgTable in `packages/db/src/schema/<pillar>/<module>/`
3. SQL migration in `packages/db/drizzle/`
4. Domain service in `packages/core/src/<pillar>/<module>/`
5. API route in `apps/api/src/routes/<pillar>/<module>/`
6. Worker handler in `apps/worker/src/jobs/<pillar>/<module>/`
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

- **`AGENTS.md`** — comprehensive AI agent architecture guide
- `PROJECT.md` — full architecture spec
- `docs/adr/adr_0005_module_architecture_restructure.md` — pillar structure ADR
- `tools/gates/` — CI enforcement scripts (18 gates incl. module-boundaries)
- `packages/contracts/src/shared/errors.ts` — all error codes
- `packages/contracts/src/kernel/governance/audit/actions.ts` — all audit actions
- `packages/contracts/src/shared/permissions.ts` — all permission keys
- `packages/contracts/src/kernel/execution/outbox/envelope.ts` — event envelope schema
