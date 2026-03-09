# @afenda/core

Domain business-logic layer for the AFENDA ERP platform.

## Quick Start

```ts
import {
  resolveRequestContext,
  fromMajorUnits,
  addMoney,
  toMajorDecimalString,
  validatePostings,
  nextNumber,
  registerDocument,
  attachEvidence,
} from "@afenda/core";
```

## Architecture

`@afenda/core` is the **only package** allowed to import both
`@afenda/contracts` (types & schemas) and `@afenda/db` (persistence).
It owns all business rules, invariant checks, and domain policy decisions.

### Domain Directories (ADR-0005 Pillar Structure)

| Directory                  | Responsibility                                                     |
| -------------------------- | ------------------------------------------------------------------ |
| `kernel/identity/`         | Identity resolution, org lookup, RBAC context                      |
| `kernel/governance/audit/` | Append-only audit log writer + read queries                        |
| `kernel/governance/evidence/` | Document registration, entity linking, retention stubs          |
| `kernel/governance/policy/` | SoD rules, capability engine, per-entity resolvers               |
| `kernel/execution/`        | Outbox dispatch, idempotency, gap-free numbering                   |
| `kernel/infrastructure/`   | Env config, Pino logger, OTel SDK, auto-tracing, insight factory   |
| `erp/finance/money/`       | Money math (ISO 4217), minor-unit arithmetic                       |
| `erp/finance/ap/`          | Invoice state machine, lifecycle (submit → approve → post → pay)   |
| `erp/finance/gl/`          | GL journal posting, trial balance                                  |
| `erp/supplier/`            | Supplier onboarding + status service (stub)                        |
| `comm/`                    | Notification, email, webhook stubs (Sprint 5+)                     |

Each directory has an `index.ts` barrel. The root `index.ts` re-exports all
barrels so consumers only ever import from `@afenda/core`.

### Key Functions

| Function                     | Module                                               | Description                              |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `resolveRequestContext`      | `kernel/identity/auth.ts`                            | JWT claims → branded `RequestContext`    |
| `resolveOrgId`               | `kernel/identity/organization.ts`                    | Org slug → `OrgId`                       |
| `fromMajorUnits`             | `erp/finance/money/money.ts`                         | Decimal → minor-unit `MoneyInput`        |
| `addMoney` / `subtractMoney` | `erp/finance/money/money.ts`                         | Safe integer arithmetic with guards      |
| `formatMoney`                | `@afenda/ui` (moved)                                 | Minor units → locale-friendly string     |
| `validatePostings`           | `erp/finance/gl/posting.ts`                          | Balance + XOR + non-negative check       |
| `canApproveInvoice`          | `kernel/governance/policy/sod-rules.ts`              | Separation-of-Duties policy gate         |
| `registerDocument`           | `kernel/governance/evidence/evidence.registry.ts`    | Persist document after S3 upload         |
| `attachEvidence`             | `kernel/governance/evidence/evidence.link.ts`        | Link document to domain entity           |
| `nextNumber`                 | `kernel/execution/numbering/numbering.ts`            | Gap-free ID (e.g. "INV-2026-0001")       |
| `writeAuditLog`              | `kernel/governance/audit/audit.ts`                   | Append-only org-scoped audit (ctx-based) |
| `withAudit`                  | `kernel/governance/audit/audit.ts`                   | Atomic domain-op + audit in one tx       |
| `validateEnv`                | `kernel/infrastructure/env.ts`                       | Typed env parsing with Zod               |
| `bootstrapTelemetry`         | `kernel/infrastructure/telemetry.ts`                 | OTel SDK init (no-op when `OTEL_ENABLED≠true`) |
| `instrumentService`          | `kernel/infrastructure/tracing.ts`                   | Auto-wrap service module with OTel spans |
| `generateInsights`           | `kernel/infrastructure/otel-insights.ts`             | Trace analysis → ranked recommendations  |

### Service Function Convention

All service functions follow the same pattern:

```ts
export async function doThing(
  db: DbClient, // always first — enables withOrgContext() wrapping
  ctx: RequestContext, // or a narrower branded type like OrgId
  input: Params, // named params object
): Promise<Result>;
```

## Testing

```bash
pnpm --filter @afenda/core test
```

Tests live in `__vitest_test__/` subdirectories colocated with their pillar (e.g. `erp/finance/ap/__vitest_test__/invoice.service.test.ts`). Never colocated with source files.

## Governance

See [OWNERS.md](./OWNERS.md) for import rules, directory nesting policy,
domain vs infrastructure separation, and CI gate enforcement details.
