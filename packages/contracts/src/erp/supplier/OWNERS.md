# OWNERS — `contracts/erp/supplier`

> **Purpose:** Supplier domain contracts including suppliers, supplier sites, and supplier bank accounts.

## Import Rules

| May import | Must NOT import |
| ---------- | --------------- |
| `@afenda/contracts` (shared primitives) | `@afenda/ui` |
| `zod` | `@afenda/db` |
| | `@afenda/core` |
| | Other monorepo packages |

## Files

| File | Exports | Description |
| ---- | ------- | ----------- |
| `index.ts` | Re-exports all domain entities and commands | Barrel export |
| `supplier.entity.ts` | `SupplierSchema`, `SupplierStatusValues`, `SupplierStatus`, `Supplier` | Supplier type definitions |
| `supplier.commands.ts` | `CreateSupplierCommandSchema`, `UpdateSupplierCommandSchema` | Supplier command schemas |
| `supplier-site.entity.ts` | `SupplierSiteSchema`, `SupplierSiteStatusValues`, `SupplierSiteStatus`, `SupplierSite` | Supplier site type definitions |
| `supplier-site.commands.ts` | `CreateSupplierSiteCommandSchema`, `UpdateSupplierSiteCommandSchema` | Supplier site command schemas |
| `supplier-bank-account.entity.ts` | `SupplierBankAccountSchema`, `SupplierBankAccountStatusValues`, `SupplierBankAccountStatus`, `SupplierBankAccount`, `BankAccountTypeValues`, `BankAccountVerificationStatusValues` | Supplier bank account type definitions |
| `supplier-bank-account.commands.ts` | `CreateSupplierBankAccountCommandSchema`, `UpdateSupplierBankAccountCommandSchema`, `VerifySupplierBankAccountCommandSchema` | Supplier bank account command schemas |

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Error codes added to `contracts/shared/errors.ts` if new failures introduced
- [ ] Audit actions added to `contracts/kernel/governance/audit/actions.ts` if new auditable events
- [ ] Outbox events added to `contracts/kernel/execution/outbox/envelope.ts` if new async events
