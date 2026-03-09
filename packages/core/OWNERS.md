# @afenda/core — OWNERS

## Purpose

Domain business logic — the **only package** that may join `@afenda/contracts`
and `@afenda/db`. All business rules, policy checks, and domain calculations
live here.

---

## Import Rules

| May import                             | Must NOT import                               |
| -------------------------------------- | --------------------------------------------- |
| `@afenda/contracts`                    | `@afenda/ui`                                  |
| `@afenda/db`                           | `fastify`                                     |
| `drizzle-orm` (types + operators only) | `react`, `next`                               |
| `node:crypto` (hashing)                | Any `zod` import **except in `infra/env.ts`** |

### Drizzle-ORM Usage (Point 2)

Core may import `drizzle-orm` for **operator helpers** (`eq`, `and`, `sql`,
type-level helpers) and schema table references from `@afenda/db`.
Core **must not** define raw SQL strings or schema DDL.

All complex query construction belongs in `@afenda/db` repository functions.
Core calls those repos; it does not replicate them.

### No Zod in Core (Point 8)

`zod` is forbidden in every core file **except** `infra/env.ts`.
Validation schemas live in `@afenda/contracts`. If core needs runtime parsing,
import the schema from contracts — do not recreate it.

---

## Directory Layout (ADR-0005 Pillar Structure)

```
src/
  kernel/                      System-level concerns (identity, governance, execution)
    identity/                  IAM — org context, JWT resolution, RBAC
      auth.ts                    RequestContext resolution; JWT → branded types
      organization.ts            Org slug → OrgId (branded UUID) resolution
      permissions.ts             Permission key constants + guard helpers
      index.ts
    governance/                Policy, audit, evidence
      audit/                     Append-only audit log writer + read queries
        audit.ts
        audit-queries.ts
        index.ts
        __vitest_test__/
          audit.test.ts
      evidence/                  Document registration, linking, retention
        evidence.link.ts           Entity ↔ document linking (attachEvidence)
        evidence.policy.ts         Retention, access, lifecycle (stub)
        evidence.registry.ts       Document metadata persistence (registerDocument)
        index.ts
      policy/                    Separation-of-Duties rules + capability engine
        capability-engine.ts       RBAC capability resolver
        sod-rules.ts               SoD gates (canApproveInvoice, canMarkPaid)
        resolvers/                 Per-entity capability resolvers
          ap-invoice.resolver.ts
          gl-account.resolver.ts
          supplier.resolver.ts
          index.ts
        index.ts
      settings/                  ← stub (Sprint 4+)
        index.ts
      index.ts
    execution/                 Outbox, idempotency, numbering, dead-letter
      outbox/
        index.ts
      idempotency/
        idempotency.ts           Duplicate-request detection and deduplication
        index.ts
      numbering/
        numbering.ts             Gap-free human-readable ID generation (INV-2026-0001)
        index.ts
      index.ts
    infrastructure/            Cross-cutting infrastructure (not business rules)
      env.ts                     Typed environment variable access (ONLY file using zod)
      logger.ts                  Pino-based structured logging (dev: pretty, prod: JSON)
      otel-insights.ts           OTel Insight Factory — trace analysis + recommendations
      telemetry.ts               OTel SDK bootstrap (OTEL_ENABLED guard)
      tracing.ts                 Auto-instrumentation for domain services
      index.ts
    registry/                  ← stub (capability registry, Sprint 4+)
      index.ts
    index.ts
  erp/                         Transactional AP/AR/GL domain logic
    finance/
      money/
        money.ts                 Money arithmetic (minor-unit integers, ISO 4217)
        index.ts
      sod.ts                     ← legacy alias; SoD rules live in kernel/governance/policy/sod-rules.ts
      ap/                        Invoice state machine, lifecycle
        invoice.service.ts
        invoice.queries.ts
        index.ts
        __vitest_test__/
          invoice.service.test.ts
      gl/                        GL journal posting, trial balance
        posting.service.ts
        posting.ts
        gl.queries.ts
        index.ts
        __vitest_test__/
          posting.service.test.ts
      __vitest_test__/           Finance-wide invariant tests
        money.test.ts
        posting.test.ts
        sod.test.ts
      index.ts
    supplier/                  Supplier onboarding + status service (stub index)
      index.ts
    crm/ hr/ inventory/ manufacturing/ project/ purchasing/ sales/
      index.ts                   ← stub placeholders (future sprints, not in Day-1 scope)
    index.ts
  comm/                        Communication & notifications
    notification/ email/ webhook/ inbox/ chatter/ sms/
      index.ts                   ← stub placeholders (Sprint 5+)
    index.ts
  index.ts                     Root barrel — re-exports pillar barrels only
```

### Subdirectory Ownership

Each pillar owns its own modules. No dedicated sub-OWNERS.md files currently exist
(the root OWNERS.md governs everything in `@afenda/core`).

| Pillar          | Contents                                                               |
| --------------- | ---------------------------------------------------------------------- |
| `kernel/`       | Identity resolution, governance (audit/evidence/policy), execution (outbox/idempotency/numbering), infrastructure (logger/telemetry/tracing/env) |
| `erp/`          | Financial domain: money, posting, SoD, AP invoice service, GL posting service, supplier (stub) |
| `comm/`         | Communication: notification, email, webhook stubs (Sprint 5+) |

### Nesting Rules

1. **Each domain directory has its own `index.ts` barrel** — exports only, no logic.
2. **Second-level nesting** (e.g. `finance/ap/`, `finance/gl/`) is expected once a
   subdomain has 3+ files. Do not wait — nest as soon as the second file lands.
3. **Cross-domain imports within core** use the sibling barrel:
   `import { resolveOrgId } from "../iam/index.js"` — never deep-path.
4. **Tests live in `__vitest_test__/` subfolders** (`finance/__vitest_test__/posting.test.ts`
   tests `finance/posting.ts`). E2E tests use `__e2e_test__/`. The CI gate
   `tools/gates/test-location.mjs` enforces this convention — no colocated tests.

---

## Domain vs Infrastructure Separation (Point 4)

| Layer      | Directories                                                        | Contains                                          |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| **Domain** | `erp/finance/`, `erp/supplier/`, `kernel/identity/`, `kernel/governance/` | Business rules, invariants, policy checks  |
| **Infra**  | `kernel/infrastructure/`                                           | Audit logging, idempotency, numbering, env config, telemetry, tracing, OTel insights |

Hard rules:

- **Domain → Infra**: allowed (e.g. `finance/` imports `infra/audit.ts`).
- **Infra → Domain**: **forbidden**. Infrastructure must know nothing about
  invoices, postings, or evidence. If infra needs domain context, lift the type
  into `@afenda/contracts`.
- If a function is "useful to every domain" it is infra, not domain.

---

## Standard Service Function Shape (Point 5)

Every exportable service function follows this signature pattern:

```ts
export async function doSomething(
  db: DbClient, // always first — enables transaction nesting
  ctx: RequestContext | OrgId, // or narrower branded type
  input: SomeParams, // structured params object
): Promise<Result>; // typed return — throw on unrecoverable error
```

Rules:

- `db` is always the first parameter so callers can wrap in `withOrgContext(db, …)`.
- Use a **named params interface** (not positional args beyond `db` + context).
- Return a typed result; throw `Error` only for truly exceptional / unrecoverable
  failures (missing config, constraint violation).

---

## Numbering / Gap-Free IDs (Point 6)

`infra/numbering.ts` provides `nextNumber()` and `ensureSequence()`.

⚠️ **Gap-free guarantee** requires calling `nextNumber()` inside the **same DB
transaction** as the domain mutation that uses the number. If the transaction
rolls back, the consumed number returns to the pool. Serializable isolation is
NOT required for gap-freedom (the `UPDATE … RETURNING` takes a row lock under
Read Committed), but it may be used globally for other invariants. Document
this constraint at every call site.

---

## Enum Sync (Point 3)

`@afenda/contracts` defines `*Values` arrays (`InvoiceStatusValues`,
`AccountTypeValues`, `SupplierStatusValues`) as `as const`. `@afenda/db`
imports them to build `pgEnum()`. The boundary gate (`tools/gates/boundaries.mjs`)
enforces parity: if the sets ever drift, CI fails.

---

## Belongs Here

- Money arithmetic + ISO 4217 minor-unit factor derivation (`finance/money.ts`)
- Separation of Duties policy checks (`finance/sod.ts`)
- Journal balance + XOR + non-negative invariant validation (`finance/posting.ts`)
- Cross-org security guards in all service functions
- Org-scoped transaction helper (re-exported `withOrgContext` from `@afenda/db`)
- Future: invoice state machine, GL posting service, approval workflows

## Does NOT Belong Here

- Zod schema definitions (→ `@afenda/contracts`)
- Table DDL / migrations (→ `@afenda/db`)
- Complex query builders (→ `@afenda/db` repositories)
- HTTP handlers / routing (→ `apps/api`)
- UI components (→ `@afenda/ui` or `apps/web`)
