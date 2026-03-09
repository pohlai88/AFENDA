# OWNERS — `contracts/erp/purchasing`

> **Purpose:** <PurchaseOrder> domain contracts for the erp/purchasing module.

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
| `index.ts` | Re-exports from `purchase-order.entity`, `purchase-order.commands`, `receipt.entity`, `receipt.commands` | Barrel export |
| `purchase-order.entity.ts` | `<PurchaseOrder>Schema`, `<PurchaseOrder>StatusValues`, `<PurchaseOrder>Status`, `<PurchaseOrder>` | PurchaseOrder type definitions |
| `purchase-order.commands.ts` | `Create<PurchaseOrder>CommandSchema`, `Update<PurchaseOrder>CommandSchema` | Command schemas |
| `receipt.entity.ts` | `ReceiptSchema`, `ReceiptStatusValues`, `ReceiptStatus`, `Receipt` | Receipt type definitions |
| `receipt.commands.ts` | `CreateReceiptCommandSchema`, `ReceiveReceiptCommandSchema`, `CancelReceiptCommandSchema` | Receipt command schemas |
<!-- Update exports and descriptions to match actual implementations -->

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Error codes added to `contracts/shared/errors.ts` if new failures introduced
- [ ] Audit actions added to `contracts/kernel/governance/audit/actions.ts` if new auditable events
- [ ] Outbox events added to `contracts/kernel/execution/outbox/envelope.ts` if new async events
