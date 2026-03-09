# OWNERS — `core/erp/supplier`

> **Purpose:** Supplier domain services including suppliers, supplier sites, and supplier bank accounts.

## Import Rules

| May import | Must NOT import |
| ---------- | --------------- |
| `@afenda/contracts` (shared primitives) | `@afenda/ui` |
| `@afenda/db` | `@afenda/api` |
| `drizzle-orm`, `zod` | Direct DB queries (use `db.query.*`) |

## Files

| File | Exports | Description |
| ---- | ------- | ----------- |
| `index.ts` | Re-exports all service and query modules | Barrel export |
| `supplier-site.service.ts` | `createSupplierSite`, `updateSupplierSite`, `SupplierSiteError` | Supplier site business logic |
| `supplier-site.queries.ts` | `getSupplierSite`, `listSupplierSites` | Supplier site query functions |
| `supplier-bank-account.service.ts` | `createSupplierBankAccount`, `updateSupplierBankAccount`, `verifySupplierBankAccount` | Supplier bank account business logic |
| `supplier-bank-account.queries.ts` | `getSupplierBankAccount`, `listSupplierBankAccounts` | Supplier bank account query functions |

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Tests added in `__vitest_test__/`
- [ ] All commands write audit logs (use `writeAuditLog` from kernel/governance)
- [ ] All async operations emit outbox events (use `emitOutboxEvent` from kernel/execution)
