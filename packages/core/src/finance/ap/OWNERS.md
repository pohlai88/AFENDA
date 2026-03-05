# core/finance/ap — OWNERS

> **Inherits all rules from [`packages/core/OWNERS.md`](../../../../OWNERS.md)
> and [`packages/core/src/finance/OWNERS.md`](../OWNERS.md).**
> This file covers only what is specific to the `ap/` subdirectory.

## Purpose

Accounts Payable domain — invoice lifecycle (state machine), status
transitions, and AP-specific query functions.

| ✅ Belongs | ❌ Never here |
|---|---|
| Invoice state machine (submit, approve, reject, void) | Zod schemas for invoice commands (→ `@afenda/contracts`) |
| Status transition guards (TRANSITIONS map) | Invoice DB table DDL (→ `@afenda/db`) |
| AP query functions (list, get-by-id, history) | HTTP route handlers (→ `apps/api`) |
| Cursor-paginated read models | S3 / document operations (→ `document/`) |
| Future: 3-way matching, AP aging buckets | UI components (→ `@afenda/ui`) |

---

## Dependency Whitelist

`finance/ap/` may import:

| Allowed import | Why |
|---|---|
| `@afenda/contracts` | Types, branded IDs, pagination constants |
| `@afenda/db` | Table references for queries and mutations |
| `drizzle-orm` | Query operators (`eq`, `and`, `desc`, `gt`, `inArray`, `sql`) |
| Sibling barrels within `@afenda/core` (`../../infra/*.js`, `../sod.js`) | Audit, numbering, SoD policies |

---

## Files

| File | Key exports | Notes |
|---|---|---|
| `invoice.service.ts` | `submitInvoice`, `approveInvoice`, `rejectInvoice`, `voidInvoice`, `TRANSITIONS`, `InvoiceServiceResult<T>`, `InvoiceServiceError` | State machine with transition guards. Uses `withAudit` + `nextNumber` in same tx for gap-free INV numbers. Emits outbox events (`AP.INVOICE_SUBMITTED`, `AP.INVOICE_APPROVED`) atomically. SoD enforcement via `canApproveInvoice`. |
| `invoice.queries.ts` | `listInvoices`, `getInvoiceById`, `getInvoiceHistory`, `InvoiceRow`, `InvoiceListParams`, `CursorPage<T>`, `InvoiceHistoryRow` | Read-only queries with cursor pagination (base64url ID cursor, fetch limit+1 pattern). Status filter on list. History ordered by `occurredAt DESC`. |
| `index.ts` | Barrel — re-exports service + queries | No logic. |
| `__vitest_test__/invoice.service.test.ts` | 14 tests | Covers: submitInvoice (success, supplier not found), approveInvoice (success, not found, already approved, invalid transition, SoD violation, missing permissions), rejectInvoice (success, not found, invalid transition), voidInvoice (success, already voided, invalid transition, not found). |

---

## State Machine Rules (Hard)

```
TRANSITIONS:
  draft       → submitted
  submitted   → approved | rejected | voided
  approved    → posted   | voided
  posted      → paid
  (paid, rejected, voided are terminal)
```

- **Every transition must be validated** via the `TRANSITIONS` map before mutation.
- **Invalid transitions** return `{ ok: false, code: "AP_INVALID_TRANSITION" }`.
- **SoD enforcement** on `approveInvoice`: submitter ≠ approver, checked via
  `canApproveInvoice()` from `../sod.js`.
- **Outbox events** are inserted in the **same transaction** as the status change.
- **Status history** row is appended on every transition for full audit trail.

---

## Service Function Shape

All service functions follow:
```ts
async function action(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  ...params
): Promise<InvoiceServiceResult<T>>
```

`InvoiceServiceResult<T>` is a discriminated union:
- `{ ok: true; data: T }`
- `{ ok: false; error: InvoiceServiceError }`

---

## Future Growth

| File (expected) | Purpose |
|---|---|
| `match.ts` | 3-way matching (PO ↔ GRN ↔ invoice) |
| `aging.ts` | AP aging buckets (current, 30, 60, 90+ days) |
