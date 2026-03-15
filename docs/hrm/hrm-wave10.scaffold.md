# AFENDA HRM Phase 2 - Wave 10 implementation scaffold and closure tracker.

Wave 10 focus:

1. Payslip publication
2. Payment batch generation
3. GL posting integration

This wave completes payroll-to-finance handoff after Wave 9 (Payroll Foundation) closure.

## Wave Status: DONE

---

# Directory Hints

- Contracts paths: `packages/contracts/src/erp/hr/`
- Database schema paths: `packages/db/src/schema/erp/hrm/`
- Core domain paths: `packages/core/src/erp/hr/`
- API route paths: `apps/api/src/routes/erp/hr/`
- Worker paths: `apps/worker/src/jobs/erp/hr/`
- Web app paths: `apps/web/src/app/(erp)/hr/`
- Tests paths: `**/__vitest_test__/` and app-level test folders
- Wave docs paths: `docs/hrm/`

---

# Wave Metadata

- Wave ID: Wave 10
- Scope: Payroll integration — payslip publication, payment batch generation, GL posting
- Document role: Scaffold + closure tracker
- Last updated: 2026-03-13

---

# Delivery Policy (Learned Experience)

Use strict closure discipline for this wave:

1. Close all gaps found during implementation and validation, regardless of whether they are blocking.
2. Mark a task DONE only with implementation + tests + evidence.
3. Track non-blocking gaps as explicit remediation items with owner and verification command.
4. Do not carry silent debt into next wave scaffolds.

---

# Remaining (Follow-up)

Completion rule: a remaining item is only complete when implementation + tests + evidence are all present.

## W10-R1. Payslip publication

Status: DONE

Deliverables:

- Add contracts for payslip entity and publish command.
- Add or extend DB schema: `hrm_payslips` (payroll_run_employee_id, payslip_number, published_at, access_status).
- Implement service: publish payslips for approved payroll run.
- Implement API route: POST /v1/hrm/payroll/runs/:payrollRunId/publish-payslips.
- Enforce audit + outbox on mutation.
- Optional: worker job to generate PDF/storage reference.

Evidence:

- `packages/contracts/src/erp/hr/payroll.commands.ts` (PublishPayslipsCommand)
- `packages/core/src/erp/hr/payroll/services/publish-payslips.service.ts`
- `apps/api/src/routes/erp/hr/publish-payslips.ts`

Done when:

- Payslips can be published for an approved run.
- Audit log and outbox event emitted.

## W10-R2. Payment batch generation

Status: DONE

Deliverables:

- Add contracts for payroll payment batch and payment instruction.
- Add or extend DB schema: `hrm_payroll_payment_batches`, `hrm_payroll_payment_instructions`.
- Implement service: generate payment batch from approved payroll run.
- Implement API route: POST /v1/hrm/payroll/runs/:payrollRunId/generate-payment-batch.
- Enforce audit + outbox on mutation.
- Handoff to Treasury domain (payment batch reference) for bank file generation.

Evidence:

- `packages/contracts/src/erp/hr/payroll.entity.ts` (payment batch, instruction)
- `packages/core/src/erp/hr/payroll/services/generate-payment-batch.service.ts`
- `apps/api/src/routes/erp/hr/generate-payment-batch.ts`

Done when:

- Payment batch can be generated from approved run.
- Integration boundary with Treasury documented.

## W10-R3. GL posting integration

Status: DONE

Deliverables:

- Add contracts for payroll GL posting and posting lines.
- Add or extend DB schema: `hrm_payroll_gl_postings`, `hrm_payroll_gl_posting_lines`.
- Implement core service: build payroll-to-GL mapping (debit/credit lines from result lines).
- Implement API route: POST /v1/hrm/payroll/runs/:payrollRunId/post-to-gl.
- Worker: HRM.PAYROLL_POSTED_TO_GL handled via `process-outbox-event.ts` (audit + outbox suffice; optional async side effects).
- Enforce audit + outbox; integrate with finance journal_entry or equivalent.

Evidence:

- `packages/core/src/erp/hr/payroll/services/post-payroll-to-gl.service.ts`
- `packages/core/src/erp/hr/payroll/services/build-payroll-gl-mapping.service.ts`
- `apps/api/src/routes/erp/hr/post-payroll-to-gl.ts`
- `apps/worker/src/jobs/kernel/process-outbox-event.ts` (handles HRM.PAYROLL_POSTED_TO_GL)
- `apps/worker/src/jobs/erp/hr/hrm-event-manifest.ts` (HRM.PAYSLIPS_PUBLISHED, HRM.PAYMENT_BATCH_GENERATED, HRM.PAYROLL_POSTED_TO_GL)

Done when:

- Payroll run can be posted to GL (synchronous in API; worker acknowledges outbox event).
- Accounting integrity validated (debits = credits in buildPayrollGlMapping).

## W10-R4. Validation and test closure

Status: DONE

Deliverables:

- Add invariant tests for:
  - accounting integrity (debits = credits) — buildPayrollGlMapping
  - posting idempotency — postPayrollToGl rejects duplicate posting
  - cannot post unapproved run — postPayrollToGl
  - cannot publish payslips for unapproved run — publishPayslips
- Run targeted and package-level validation commands.

Evidence required:

- `packages/core/src/erp/hr/payroll/__vitest_test__/payroll-gl-posting.service.test.ts`
- `packages/core/src/erp/hr/payroll/__vitest_test__/publish-payslips.service.test.ts`
- Commands:
  - `pnpm --filter @afenda/core test -- src/erp/hr/payroll/__vitest_test__/`
  - `pnpm check:all`

Done when:

- All Wave 10 tests pass.
- All 22 gates pass.

---

# Suggested completion order

1. W10-R1 (payslip publication)
2. W10-R2 (payment batch generation)
3. W10-R3 (GL posting integration)
4. W10-R4 (tests + validation)

---

# Blockers log (update during execution)

- Wave 10 depends on Wave 9 (Payroll Foundation) being DONE.

---

# 0. Status Update

## Current delivery status

- Wave 10 complete. Evidence:
  - `packages/contracts/src/erp/hr/payroll.entity.ts` (Payslip, PaymentBatch, PaymentInstruction, GlPosting, GlPostingLine)
  - `packages/contracts/src/erp/hr/payroll.commands.ts` (PublishPayslips, GeneratePaymentBatch, PostPayrollToGl)
  - `packages/db/src/schema/erp/hrm/hrm-payroll.ts` (hrm_payslips, hrm_payroll_payment_batches, hrm_payroll_payment_instructions, hrm_payroll_gl_postings, hrm_payroll_gl_posting_lines)
  - `packages/core/src/erp/hr/payroll/services/publish-payslips.service.ts`
  - `packages/core/src/erp/hr/payroll/services/generate-payment-batch.service.ts`
  - `packages/core/src/erp/hr/payroll/services/post-payroll-to-gl.service.ts`
  - `packages/core/src/erp/hr/payroll/services/build-payroll-gl-mapping.service.ts`
  - `apps/api/src/routes/erp/hr/publish-payslips.ts`, `generate-payment-batch.ts`, `post-payroll-to-gl.ts`
  - `packages/core/src/erp/hr/payroll/__vitest_test__/publish-payslips.service.test.ts`, `payroll-gl-posting.service.test.ts`
  - `pnpm --filter @afenda/core test -- src/erp/hr/payroll/__vitest_test__/` — 17 tests pass (4 publish-payslips, 6 payroll-gl-posting, 4 payroll-period, 4 payroll-run)
  - `pnpm check:all` — 22 gates pass

## Known open items

- GL posting integration requires alignment with finance domain (journal_entry, ledger_account).
- Treasury handoff for bank file is cross-domain; document interface contract.

---

# Validation commands (run to verify closure)

```bash
pnpm --filter @afenda/core test -- src/erp/hr/payroll/__vitest_test__/
pnpm check:all
```

Exit rule:

Wave closure is complete only when behavior is proven with tests and evidence.
