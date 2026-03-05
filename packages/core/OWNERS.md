# @afenda/core — OWNERS

## Purpose
Domain business logic — the **only package** that may join `@afenda/contracts`
and `@afenda/db`.  All business rules, policy checks, and domain calculations
live here.

---

## Import Rules

| May import              | Must NOT import         |
|-------------------------|-------------------------|
| `@afenda/contracts`     | `@afenda/ui`            |
| `@afenda/db`            | `fastify`               |
| `drizzle-orm` (types + operators only) | `react`, `next` |
| `node:crypto` (hashing) | Any `zod` import **except in `infra/env.ts`** |

### Drizzle-ORM Usage  (Point 2)

Core may import `drizzle-orm` for **operator helpers** (`eq`, `and`, `sql`,
type-level helpers) and schema table references from `@afenda/db`.
Core **must not** define raw SQL strings or schema DDL.

All complex query construction belongs in `@afenda/db` repository functions.
Core calls those repos; it does not replicate them.

### No Zod in Core  (Point 8)

`zod` is forbidden in every core file **except** `infra/env.ts`.
Validation schemas live in `@afenda/contracts`.  If core needs runtime parsing,
import the schema from contracts — do not recreate it.

---

## Directory Layout

```
src/
  iam/               Identity & access context
    auth.ts             RequestContext resolution; JWT → branded types
    tenant.ts           Org slug → OrgId (branded UUID) resolution
  finance/           Financial domain rules & invariants
    money.ts            Money arithmetic (minor-unit integers, ISO 4217)
    posting.ts          Journal balance + XOR + non-negative invariant
    sod.ts              Separation-of-Duties policy rules
    __vitest_test__/    Dedicated test folder (excluded from tsc build)
      posting.test.ts     Vitest tests for posting invariants
      sod.test.ts         Vitest tests for SoD policy rules
    ap/                 ← S1: invoice state machine, matching, aging
    gl/                 ← S1: GL journal posting, trial balance, period close
  document/          Document & evidence domain
    evidence.registry.ts  Document metadata persistence (registerDocument)
    evidence.link.ts      Entity ↔ document linking (attachEvidence)
    evidence.policy.ts    Retention, access, lifecycle (stub)
  infra/             Cross-cutting infrastructure (not business rules)
    audit.ts            Append-only audit log writer
    env.ts              Typed environment variable access (ONLY file using zod)
    idempotency.ts      Duplicate-request detection and deduplication
    numbering.ts        Gap-free human-readable ID generation (INV-2026-0001)
  supplier/            ← S1: supplier onboarding + status service
  index.ts           Root barrel — re-exports domain barrels only
```

### Subdirectory Ownership

Each directory has its own OWNERS.md that inherits the rules above and documents
its specific files, exports, and domain-specific constraints.

| Directory     | Contents                                        | OWNERS |
|---------------|-------------------------------------------------|--------|
| `iam/`        | Identity resolution, org context, RBAC       | [→ iam/OWNERS.md](src/iam/OWNERS.md) |
| `finance/`    | Money math, posting invariants, SoD policy       | [→ finance/OWNERS.md](src/finance/OWNERS.md) |
| `document/`   | Evidence registration, entity linking, retention | [→ document/OWNERS.md](src/document/OWNERS.md) |
| `infra/`      | Audit, idempotency, numbering, env config        | [→ infra/OWNERS.md](src/infra/OWNERS.md) |

### Nesting Rules

1. **Each domain directory has its own `index.ts` barrel** — exports only, no logic.
2. **Second-level nesting** (e.g. `finance/ap/`, `finance/gl/`) is expected once a
   subdomain has 3+ files.  Do not wait — nest as soon as the second file lands.
3. **Cross-domain imports within core** use the sibling barrel:
   `import { resolveOrgId } from "../iam/index.js"` — never deep-path.
4. **Tests live in `__vitest_test__/` subfolders** (`finance/__vitest_test__/posting.test.ts`
   tests `finance/posting.ts`). E2E tests use `__e2e_test__/`. The CI gate
   `tools/gates/test-location.mjs` enforces this convention — no colocated tests.

---

## Domain vs Infrastructure Separation  (Point 4)

| Layer       | Directories           | Contains                            |
|-------------|-----------------------|-------------------------------------|
| **Domain**  | `iam/`, `finance/`, `document/`, `supplier/` | Business rules, invariants, policy checks |
| **Infra**   | `infra/`              | Audit logging, idempotency, numbering, env config |

Hard rules:
- **Domain → Infra**: allowed (e.g. `finance/` imports `infra/audit.ts`).
- **Infra → Domain**: **forbidden**.  Infrastructure must know nothing about
  invoices, postings, or evidence.  If infra needs domain context, lift the type
  into `@afenda/contracts`.
- If a function is "useful to every domain" it is infra, not domain.

---

## Standard Service Function Shape  (Point 5)

Every exportable service function follows this signature pattern:

```ts
export async function doSomething(
  db: DbClient,                  // always first — enables transaction nesting
  ctx: RequestContext | OrgId, // or narrower branded type
  input: SomeParams,             // structured params object
): Promise<Result>               // typed return — throw on unrecoverable error
```

Rules:
- `db` is always the first parameter so callers can wrap in `withOrgContext(db, …)`.
- Use a **named params interface** (not positional args beyond `db` + context).
- Return a typed result; throw `Error` only for truly exceptional / unrecoverable
  failures (missing config, constraint violation).

---

## Numbering / Gap-Free IDs  (Point 6)

`infra/numbering.ts` provides `nextNumber()` and `ensureSequence()`.

⚠️  **Gap-free guarantee** requires calling `nextNumber()` inside the **same DB
transaction** as the domain mutation that uses the number.  If the transaction
rolls back, the consumed number returns to the pool.  Serializable isolation is
NOT required for gap-freedom (the `UPDATE … RETURNING` takes a row lock under
Read Committed), but it may be used globally for other invariants.  Document
this constraint at every call site.

---

## Enum Sync  (Point 3)

`@afenda/contracts` defines `*Values` arrays (`InvoiceStatusValues`,
`AccountTypeValues`, `SupplierStatusValues`) as `as const`.  `@afenda/db`
imports them to build `pgEnum()`.  The boundary gate (`tools/gates/boundaries.mjs`)
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
