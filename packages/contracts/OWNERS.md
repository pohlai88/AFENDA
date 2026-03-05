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

## 6. Subdirectory Layout

Each directory has its own OWNERS.md that inherits these rules and documents its specific files, exports, and DB alignment snippets.

| Directory   | Contents                                                             | OWNERS                                         |
| ----------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| `shared/`   | Headers, envelopes, money, pagination, outbox, IDs, error codes      | [→ shared/OWNERS.md](src/shared/OWNERS.md)     |
| `iam/`      | Organization, role (permissions), principal, request-context schemas | [→ iam/OWNERS.md](src/iam/OWNERS.md)           |
| `supplier/` | Supplier status + entity + CRUD schemas                              | [→ supplier/OWNERS.md](src/supplier/OWNERS.md) |
| `invoice/`  | Invoice status + entity + command schemas                            | [→ invoice/OWNERS.md](src/invoice/OWNERS.md)   |
| `gl/`       | Account type + entity + GL command schemas                           | [→ gl/OWNERS.md](src/gl/OWNERS.md)             |
| `evidence/` | Document entity + attach/register command schemas                    | [→ evidence/OWNERS.md](src/evidence/OWNERS.md) |

### `shared/` sub-files (cross-domain primitives only)

Files in `shared/` are for primitives **used in 3 or more domains**.
Do not dump single-domain types here to avoid bloat.

| File            | Contents                                                    |
| --------------- | ----------------------------------------------------------- |
| `ids.ts`        | Branded UUID types (`OrgId`, `PrincipalId`, `InvoiceId`, …) |
| `money.ts`      | `MoneySchema`, `CurrencyCode`                               |
| `envelope.ts`   | `ErrorEnvelope`, `SuccessEnvelope`, `CursorEnvelope`        |
| `errors.ts`     | `ErrorCode` enum + `ApiError` schema                        |
| `headers.ts`    | HTTP header name constants                                  |
| `pagination.ts` | `CursorParams`                                              |
| `outbox.ts`     | `OutboxEvent`                                               |

---

## 7. Does NOT Belong Here

- Database table definitions → `@afenda/db`
- Business logic or policy functions → `@afenda/core`
- React components → `@afenda/ui`
- Runtime side effects (HTTP calls, file I/O, DB queries)
- Drizzle relations or query builders
