# OWNERS — `core/erp/purchasing`

> **Purpose:** <PurchaseOrder> domain services for the erp/purchasing module.

## Import Rules

| May import | Must NOT import |
| ---------- | --------------- |
| `@afenda/contracts` (shared primitives) | `@afenda/ui` |
| `@afenda/db` | `@afenda/api` |
| `drizzle-orm`, `zod` | Direct DB queries (use `db.query.*`) |

## Files

| File | Exports | Description |
| ---- | ------- | ----------- |
| `index.ts` | Re-exports from `purchase-order.service`, `purchase-order.queries`, `receipt.service`, `receipt.queries` | Barrel export |
| `purchase-order.service.ts` | `create<PurchaseOrder>`, `update<PurchaseOrder>`, `<PurchaseOrder>Error` | Business logic layer |
| `purchase-order.queries.ts` | `get<PurchaseOrder>`, `list<PurchaseOrder>s` | Read-only query functions |
| `receipt.service.ts` | `createReceipt`, `receiveReceipt`, `cancelReceipt`, `ReceiptError` | Receipt business logic layer |
| `receipt.queries.ts` | `getReceipt`, `listReceipts` | Receipt read-only query functions |
<!-- Update exports and descriptions to match actual implementations -->

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Tests added in `__vitest_test__/`
- [ ] All commands write audit logs (use `writeAuditLog` from kernel/governance)
- [ ] All async operations emit outbox events (use `emitOutboxEvent` from kernel/execution)
