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

### Domain Directories

| Directory   | Responsibility                                         |
| ----------- | ------------------------------------------------------ |
| `iam/`      | Identity resolution, org lookup, RBAC context          |
| `finance/`  | Money math (ISO 4217), posting validation, SoD policy  |
| `document/` | Evidence registration, entity linking, retention stubs |
| `infra/`    | Audit logging, idempotency, numbering, env config      |

Each directory has an `index.ts` barrel. The root `index.ts` re-exports all
barrels so consumers only ever import from `@afenda/core`.

### Key Functions

| Function                     | Module                          | Description                              |
| ---------------------------- | ------------------------------- | ---------------------------------------- |
| `resolveRequestContext`      | `iam/auth.ts`                   | JWT claims → branded `RequestContext`    |
| `resolveOrgId`               | `iam/tenant.ts`                 | Org slug → `OrgId`                       |
| `fromMajorUnits`             | `finance/money.ts`              | Decimal → minor-unit `MoneyInput`        |
| `addMoney` / `subtractMoney` | `finance/money.ts`              | Safe integer arithmetic with guards      |
| `formatMoney`                | `@afenda/ui` (moved)            | Minor units → locale-friendly string     |
| `validatePostings`           | `finance/posting.ts`            | Balance + XOR + non-negative check       |
| `canApproveInvoice`          | `finance/sod.ts`                | Separation-of-Duties policy gate         |
| `registerDocument`           | `document/evidence.registry.ts` | Persist document after S3 upload         |
| `attachEvidence`             | `document/evidence.link.ts`     | Link document to domain entity           |
| `nextNumber`                 | `infra/numbering.ts`            | Gap-free ID (e.g. "INV-2026-0001")       |
| `writeAuditLog`              | `infra/audit.ts`                | Append-only org-scoped audit (ctx-based) |
| `withAudit`                  | `infra/audit.ts`                | Atomic domain-op + audit in one tx       |
| `validateEnv`                | `infra/env.ts`                  | Typed env parsing with Zod               |

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

Tests colocate next to their source files (e.g. `posting.test.ts`).

## Governance

See [OWNERS.md](./OWNERS.md) for import rules, directory nesting policy,
domain vs infrastructure separation, and CI gate enforcement details.
