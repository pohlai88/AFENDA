# @afenda/contracts — OWNERS

## Purpose

Pure Zod validation schemas and TypeScript types for the entire monorepo.
This package is the **canonical meaning layer**: it owns the _shape and semantics_
of every domain entity, command, event, and shared primitive.
It does **not** own storage implementation — that belongs in `@afenda/db`.

---

## 1. Truth Boundary

| Layer               | Owns                                                                                                              | Does NOT own                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `@afenda/contracts` | Entity DTOs, status enums, command/event payloads, pagination, error codes, ID types, header constants, envelopes | Drizzle tables, indexes, relations, SQL defaults, RLS policies |
| `@afenda/db`        | Schema tables, migrations, relations                                                                              | Validation logic or business rules                             |

**Important pattern — enum alignment without leaking tables:**

```ts
// contracts/invoice/invoice.entity.ts
export const InvoiceStatusValues = ["draft", "submitted", "approved", "posted", "voided"] as const;
export const InvoiceStatusSchema = z.enum(InvoiceStatusValues);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;
```

```ts
// db/schema/finance.ts
import { InvoiceStatusValues } from "@afenda/contracts";
export const invoiceStatusEnum = pgEnum("invoice_status", InvoiceStatusValues);
```

This keeps `@afenda/db` as the truth consumer, not the truth owner.

---

## 2. JSON-First Types (Hard Rule)

All types in this package must be safe to `JSON.stringify` across process boundaries
(API → UI, API → Worker, Worker → Queue).

| ✅ Allowed                                         | ❌ Never use         |
| -------------------------------------------------- | -------------------- |
| `string`, `number`, `boolean`, `null`              | `Date` instances     |
| ISO-8601 datetime strings (`UtcDateTimeSchema`)    | `BigInt`             |
| Integer minor units for money (`z.number().int()`) | `Map`, `Set`         |
| `z.string().uuid()` for IDs                        | Class instances      |
| Arrays and plain objects                           | Symbols or functions |

Violation example:

```ts
// ❌ Wrong — Date is not JSON-safe
dueDate: z.date();

// ✅ Correct
dueDate: z.string().datetime().nullable();
```

---

## 3. Import Rules

| May import                                  | Must NOT import                                               |
| ------------------------------------------- | ------------------------------------------------------------- |
| `zod`                                       | `@afenda/db`                                                  |
| Other pure schema helpers (no side effects) | `@afenda/core`                                                |
|                                             | `@afenda/ui`                                                  |
|                                             | `drizzle-orm`, `drizzle-kit`, `pg`                            |
|                                             | Any Node.js runtime module (`fs`, `path`, `crypto`, `node:*`) |

**Who may import `@afenda/contracts`:**

- ✅ `@afenda/db` (to consume `*Values` enum arrays for `pgEnum`)
- ✅ `@afenda/core` (to consume entity types and command schemas)
- ✅ `apps/api`, `apps/web`, `apps/worker`, `@afenda/ui`
- ❌ `@afenda/contracts` itself (no circular self-imports)

This import graph is enforced automatically by `tools/gates/boundaries.mjs`
in every CI run. Do not rely on human review alone.

---

## 4. Public API — Barrel Imports Only

**Rule:** Consumers MUST import from the package root or a domain barrel.
Deep file imports are forbidden.

```ts
// ✅ Correct
import type { Invoice, InvoiceStatus } from "@afenda/contracts";
import type { Invoice } from "@afenda/contracts/invoice"; // domain barrel

// ❌ Wrong — unstable, breaks on internal refactors
import type { Invoice } from "@afenda/contracts/src/invoice/invoice.entity";
```

Internal structure:

- `src/index.ts` — root barrel (re-exports all domain barrels)
- `src/{domain}/index.ts` — domain barrel (re-exports entity + commands)
- Individual files import freely from each other within the same domain

---

## 5. File Naming Convention

Every file in a domain directory must follow this naming pattern:

| Suffix          | Contains                                    |
| --------------- | ------------------------------------------- |
| `*.entity.ts`   | Canonical entity DTO schema + inferred type |
| `*.commands.ts` | Write/mutation command payloads             |
| `*.events.ts`   | Emitted event payloads (outbox, webhooks)   |
| `*.query.ts`    | Read/filter/search input DTOs               |

Example layout for `invoice/`:

```
invoice/
  index.ts              ← domain barrel
  invoice.entity.ts     ← InvoiceSchema, InvoiceStatus, InvoiceStatusValues
  invoice.commands.ts   ← SubmitInvoiceCommand, ApproveInvoiceCommand, …
  invoice.events.ts     ← INVOICE_POSTED, INVOICE_VOIDED, …  (add as needed)
```

---

## 6. Subdirectory Layout (ADR-0005 Pillar Structure)

Each directory has an `index.ts` barrel. This file governs them all.

| Directory                              | Contents                                                             |
| -------------------------------------- | -------------------------------------------------------------------- |
| `shared/`                              | Cross-domain primitives (IDs, money, errors, pagination, envelope, headers, permissions, datetime) — see `shared/OWNERS.md` |
| `kernel/identity/`                     | Party, person, organization, principal, role, membership, tenant, user entity schemas |
| `kernel/governance/audit/`             | Audit log query schemas, audit action constants                      |
| `kernel/governance/evidence/`          | Document entity + attach/register command schemas                    |
| `kernel/governance/policy/`            | Policy context schema                                                |
| `kernel/governance/settings/`          | ← stub (Sprint 4+)                                                   |
| `kernel/execution/outbox/`             | Outbox event envelope schema                                         |
| `kernel/execution/idempotency/`        | Idempotency request-key schema                                       |
| `kernel/execution/numbering/`          | Sequence schema                                                      |
| `kernel/registry/`                     | Capability, entity-def, field-def, view-def, action-def, flow-def, overlay-def schemas |
| `erp/finance/ap/`                      | Invoice status + entity + command schemas                            |
| `erp/finance/gl/`                      | Account type + journal entry + GL command schemas                    |
| `erp/finance/ar/ assets/ consolidation/ costing/ fiscal/ fx/ intercompany/ lease/ reporting/ tax/ treasury/` | ← stub placeholders (not in Day-1 scope) |
| `erp/supplier/`                        | Supplier status + entity + CRUD command schemas                      |
| `erp/crm/ hr/ inventory/ manufacturing/ project/ purchasing/ sales/` | ← stub placeholders (future) |
| `comm/notification/ email/ webhook/ inbox/ chatter/ sms/` | ← stub placeholders (Sprint 5+)          |

### `shared/` sub-files (cross-domain primitives only)

Files in `shared/` are for primitives **used in 3 or more domains**.
Do not dump single-domain types here to avoid bloat.

| File             | Contents                                                    |
| ---------------- | ----------------------------------------------------------- |
| `ids.ts`         | Branded UUID types (`OrgId`, `PrincipalId`, `InvoiceId`, …) |
| `money.ts`       | `MoneySchema`, `CurrencyCode`                               |
| `envelope.ts`    | `ErrorEnvelope`, `SuccessEnvelope`, `CursorEnvelope`        |
| `errors.ts`      | `ErrorCode` enum + `ApiError` schema                        |
| `headers.ts`     | HTTP header name constants                                  |
| `pagination.ts`  | `CursorParams`                                              |
| `permissions.ts` | `PermissionValues`, `Permission`, `PERMISSION_SCOPES`       |
| `datetime.ts`    | `UtcDateTimeSchema`, `DateSchema`, `DateRangeSchema`        |
| `index.ts`       | Domain barrel — re-exports all of the above                 |

---

## 7. Does NOT Belong Here

- Database table definitions → `@afenda/db`
- Business logic or policy functions → `@afenda/core`
- React components → `@afenda/ui`
- Runtime side effects (HTTP calls, file I/O, DB queries)
- Drizzle relations or query builders
