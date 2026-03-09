# OWNERS — `contracts/erp/finance/ap`

> **Purpose:** Accounts Payable domain contracts including invoices, holds, payment runs, prepayments, match tolerances, and WHT certificates.

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
| `invoice.entity.ts` | `InvoiceSchema`, `InvoiceStatusValues`, `InvoiceStatus`, `Invoice` | Invoice type definitions |
| `invoice.commands.ts` | `CreateInvoiceCommandSchema`, `UpdateInvoiceCommandSchema` | Invoice command schemas |
| `invoice-line.entity.ts` | `InvoiceLineSchema`, `InvoiceLine` | Invoice line item type definitions |
| `invoice-line.commands.ts` | `CreateInvoiceLineCommandSchema`, `UpdateInvoiceLineCommandSchema` | Invoice line command schemas |
| `hold.entity.ts` | `ApHoldSchema`, `ApHoldStatusValues`, `ApHoldStatus`, `ApHold` | AP hold type definitions |
| `hold.commands.ts` | `CreateApHoldCommandSchema`, `ReleaseApHoldCommandSchema` | AP hold command schemas |
| `payment-terms.entity.ts` | `PaymentTermsSchema`, `PaymentTermsStatusValues`, `PaymentTermsStatus`, `PaymentTerms` | Payment terms type definitions |
| `payment-terms.commands.ts` | `CreatePaymentTermsCommandSchema`, `UpdatePaymentTermsCommandSchema` | Payment terms command schemas |
| `payment-run.entity.ts` | `PaymentRunSchema`, `PaymentRunStatusValues`, `PaymentRunStatus`, `PaymentRun` | Payment run type definitions |
| `payment-run.commands.ts` | `CreatePaymentRunCommandSchema`, `ApprovePaymentRunCommandSchema`, `ExecutePaymentRunCommandSchema` | Payment run command schemas |
| `payment-run-item.entity.ts` | `PaymentRunItemSchema`, `PaymentRunItemStatusValues`, `PaymentRunItemStatus`, `PaymentRunItem` | Payment run item type definitions |
| `payment-run-item.commands.ts` | `CreatePaymentRunItemCommandSchema`, `UpdatePaymentRunItemCommandSchema` | Payment run item command schemas |
| `prepayment.entity.ts` | `PrepaymentSchema`, `PrepaymentStatusValues`, `PrepaymentStatus`, `Prepayment`, `PrepaymentApplicationSchema` | Prepayment type definitions |
| `prepayment.commands.ts` | `CreatePrepaymentCommandSchema`, `ApplyPrepaymentCommandSchema`, `VoidPrepaymentCommandSchema` | Prepayment command schemas |
| `match-tolerance.entity.ts` | `MatchToleranceSchema`, `MatchToleranceScopeValues`, `MatchToleranceScope`, `MatchTolerance` | Match tolerance type definitions |
| `match-tolerance.commands.ts` | `CreateMatchToleranceCommandSchema`, `UpdateMatchToleranceCommandSchema` | Match tolerance command schemas |
| `wht-certificate.entity.ts` | `WhtCertificateSchema`, `WhtCertificateStatusValues`, `WhtCertificateStatus`, `WhtCertificate`, `WhtExemptionSchema` | WHT certificate type definitions |
| `wht-certificate.commands.ts` | `CreateWhtCertificateCommandSchema`, `ApproveWhtCertificateCommandSchema` | WHT certificate command schemas |

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Error codes added to `contracts/shared/errors.ts` if new failures introduced
- [ ] Audit actions added to `contracts/kernel/governance/audit/actions.ts` if new auditable events
- [ ] Outbox events added to `contracts/kernel/execution/outbox/envelope.ts` if new async events
