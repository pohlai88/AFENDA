# contracts/supplier — OWNERS

> **Package-wide rules (import boundaries, JSON-first types, barrel imports,
> file naming) are inherited from the root
> [`packages/contracts/OWNERS.md`](../../OWNERS.md).
> This file covers only what is specific to the `supplier/` directory.**

## Purpose

Supplier entity and command schemas (party model — buyer-side relationship record).
Supplier is a **buyer-side relationship record** (not the global party master). It references party/contact primitives but does not become a full MDM party model. Keep the model minimal; escalate true master-data concerns to MDM.

## File Conventions

| Pattern         | Purpose                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `*.entity.ts`   | Canonical DTO shape (read model). No write-only or transitional fields.                                         |
| `*.commands.ts` | Create / update / onboard payloads. Must not inherit `createdAt`, `statusHistory`, or other entity-only fields. |

## Files

| File                   | Key exports                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `supplier.entity.ts`   | `SupplierStatusValues`, `SupplierStatusSchema`, `SupplierStatus`, `SupplierSchema`, `CreateSupplierSchema` |
| `supplier.commands.ts` | `OnboardSupplierCommandSchema`, `SuspendSupplierCommandSchema`, `ReactivateSupplierCommandSchema`          |
| `index.ts`             | Domain barrel — re-exports all of the above                                                                |

## DB Alignment

Import `SupplierStatusValues` in `packages/db/src/schema/supplier.ts`:

```ts
import { SupplierStatusValues } from "@afenda/contracts";
export const supplierStatusEnum = pgEnum("supplier_status", SupplierStatusValues);
```

## Belongs Here

- `SupplierStatusValues` / `SupplierStatusSchema` / `SupplierStatus`
- `SupplierSchema` and inferred `Supplier` type
- `CreateSupplierSchema`
- Future: `UpdateSupplierSchema`, `OnboardSupplierCommandSchema` (add `supplier.commands.ts`)
- Use shared ID primitives (`SupplierIdSchema` from `shared/ids.ts`, `DocumentIdSchema` for attachment refs) — never raw UUID strings in domain files.
- Use shared money/pagination primitives (`MoneySchema`, `CurrencyCodeSchema`, `PaginationSchema`) where applicable (e.g. credit limit, payment terms).
- `OrgIdSchema` may appear in command payloads when context is not propagated via headers; omit from entity if the API always injects org context.
- Contact fields (email, phone) are permitted as JSON-first fields; masking/redaction logic must live in `@afenda/core` or the UI layer — never in contracts.

## Does NOT Belong Here

- Supplier DB table definition → `packages/db/src/schema/supplier.ts`
- Supplier onboarding workflow logic → `packages/core`
- Status transition rules (state machine), approval routing, SoD constraints → `packages/core`
- Full party master model (addresses, contacts, identities at MDM depth) → MDM domain (future)
