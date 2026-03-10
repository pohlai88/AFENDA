# OWNERS — `core/erp/finance/ap`

> **Purpose:** Accounts Payable domain services including invoices, holds, payment runs, prepayments, match tolerances, and WHT certificates.

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
| `aging.service.ts` | `getAgingReport`, `GetAgingParams`, `AgingServiceResult` | AP aging report generation |
| `aging.queries.ts` | `getInvoicesByAgingBucket`, `InvoiceAgingRow` | Aging bucket drill-down queries |
| `invoice.service.ts` | `createInvoice`, `updateInvoice`, `InvoiceError` | Invoice business logic |
| `invoice.queries.ts` | `getInvoice`, `listInvoices` | Invoice query functions |
| `invoice-line.service.ts` | `createInvoiceLine`, `updateInvoiceLine` | Invoice line business logic |
| `invoice-line.queries.ts` | `getInvoiceLine`, `listInvoiceLines` | Invoice line query functions |
| `hold.service.ts` | `createApHold`, `releaseApHold`, `ApHoldError` | AP hold business logic |
| `hold.queries.ts` | `getApHold`, `listApHolds` | AP hold query functions |
| `payment-terms.service.ts` | `createPaymentTerms`, `updatePaymentTerms`, `PaymentTermsError` | Payment terms business logic |
| `payment-terms.queries.ts` | `getPaymentTerms`, `listPaymentTerms` | Payment terms query functions |
| `payment-run.service.ts` | `createPaymentRun`, `approvePaymentRun`, `executePaymentRun` | Payment run business logic |
| `payment-run.queries.ts` | `getPaymentRun`, `listPaymentRuns` | Payment run query functions |
| `payment-run-item.service.ts` | `createPaymentRunItem`, `updatePaymentRunItem` | Payment run item business logic |
| `payment-run-item.queries.ts` | `getPaymentRunItem`, `listPaymentRunItems` | Payment run item query functions |
| `prepayment.service.ts` | `createPrepayment`, `applyPrepayment`, `voidPrepayment` | Prepayment business logic |
| `prepayment.queries.ts` | `getPrepayment`, `listPrepayments` | Prepayment query functions |
| `match-tolerance.service.ts` | `createMatchTolerance`, `updateMatchTolerance` | Match tolerance business logic |
| `match-tolerance.queries.ts` | `getMatchTolerance`, `listMatchTolerances` | Match tolerance query functions |
| `wht-certificate.service.ts` | `createWhtCertificate`, `approveWhtCertificate` | WHT certificate business logic |
| `wht-certificate.queries.ts` | `getWhtCertificate`, `listWhtCertificates` | WHT certificate query functions |
| `validate-invoice.ts` | `validateInvoiceForSubmission`, `validateInvoiceForApproval`, `validateInvoiceForPayment` | Shared invoice validation helpers |

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Tests added in `__vitest_test__/`
- [ ] All commands write audit logs (use `writeAuditLog` from kernel/governance)
- [ ] All async operations emit outbox events (use `emitOutboxEvent` from kernel/execution)
