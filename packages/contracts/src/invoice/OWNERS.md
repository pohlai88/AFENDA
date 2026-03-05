# contracts/invoice — OWNERS

> **Package-wide rules (import boundaries, JSON-first types, barrel imports,
> file naming) are inherited from the root
> [`packages/contracts/OWNERS.md`](../../OWNERS.md).
> This file covers only what is specific to the `invoice/` directory.**

## Purpose
Invoice entity schemas and AP-workflow command schemas.
**Scope: AP vendor invoices only.** AR customer invoices are out of scope and belong in an `ar/` domain (future). Do not mix vendor/customer concepts (numbering, terms, posting rules) in this directory.

## File Conventions

| Pattern | Purpose |
|---|---|
| `*.entity.ts` | Header DTO + summary totals + IDs. Keep it header-only; no line-item arrays once complexity grows. |
| `*.commands.ts` | Write payloads for AP workflow transitions. Every command must include `invoiceId` + `correlationId`; add `idempotencyKey` where a worker or queue may replay. |
| `*.lines.ts` | `InvoiceLineSchema`, tax breakdown, allocation keys. Split from entity when line/tax complexity grows to avoid 2,000-line entity files. |
| `*.events.ts` | Domain events emitted after state changes (future: `INVOICE_POSTED`, `INVOICE_VOIDED`). |

## Files

| File | Key exports |
|---|---|
| `invoice.entity.ts` | `InvoiceStatusValues`, `InvoiceStatusSchema`, `InvoiceStatus`, `InvoiceSchema`, `Invoice` |
| `invoice.commands.ts` | `SubmitInvoiceCommandSchema`, `ApproveInvoiceCommandSchema`, `RejectInvoiceCommandSchema` |
| `index.ts` | Domain barrel — re-exports all of the above |

## DB Alignment
Import `InvoiceStatusValues` in `packages/db/src/schema/finance.ts`:
```ts
import { InvoiceStatusValues } from '@afenda/contracts';
export const invoiceStatusEnum = pgEnum('invoice_status', InvoiceStatusValues);
```
> Consider `db/schema/ap.ts` for AP-only tables as the domain grows, keeping `finance.ts` for truly shared finance primitives.

## Belongs Here
- `InvoiceStatusValues` / `InvoiceStatusSchema` / `InvoiceStatus`
- `InvoiceSchema` and inferred `Invoice` type
- `SubmitInvoiceCommandSchema`, `ApproveInvoiceCommandSchema`, `RejectInvoiceCommandSchema`
- Future: `MatchInvoiceCommandSchema`, `PayInvoiceCommandSchema` (add to `invoice.commands.ts`)
- Future: `invoice.events.ts` for INVOICE_POSTED, INVOICE_VOIDED events
- Invoice schemas **must** use shared primitives:
  - IDs: `InvoiceIdSchema`, `SupplierIdSchema` (relationship ID — not `supplierOrgId`), `OrgIdSchema`, `DocumentIdSchema`, `CorrelationIdSchema`
  - Money: `z.coerce.bigint()` for `amountMinor` (bigint minor units), `CurrencyCodeSchema` for currency. Negative values are valid (credit notes).
  - Pagination/query contracts: `CursorParamsSchema`

## Does NOT Belong Here
- Invoice DB table or status history table → `packages/db/src/schema/finance.ts`
- Approval policy / SoD checks → `packages/core/src/sod.ts`
- Matching policy, approval routing, posting rules → `packages/core`
- AR customer invoices → AR domain (future)
