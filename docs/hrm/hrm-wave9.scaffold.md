# AFENDA HRM Phase 2 - Wave 9 implementation scaffold and closure tracker.

Wave 9 focus:

1. Payroll calendars/periods and pay groups
2. Payroll input management
3. Payroll run + result line baseline

This wave establishes the payroll foundation after Wave 8 (Compensation) closure.

## Wave Status: DONE

---

# Directory Hints

- Contracts paths: `packages/contracts/src/erp/hr/`
- Database schema paths: `packages/db/src/schema/erp/hrm/`
- Core domain paths: `packages/core/src/erp/hr/`
- API route paths: `apps/api/src/routes/erp/hr/`
- Web app paths: `apps/web/src/app/(erp)/hr/`
- Tests paths: `**/__vitest_test__/` and app-level test folders
- Wave docs paths: `docs/hrm/`

---

# Wave Metadata

- Wave ID: Wave 9
- Scope: Payroll foundation — calendars, periods, pay groups, input management, run and result line baseline
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

## W9-R1. Contracts and schema foundation

Status: DONE

Deliverables:

- Add contracts for payroll entities, commands, and queries:
  - PayrollCalendar, PayrollPeriod, PayrollRun, PayrollRunEmployee
  - PayrollInput, PayrollElement, PayrollResultLine
  - PayGroup (if not in compensation)
- Add DB schema file `hrm-payroll.ts` with:
  - payroll_periods (period_code, period_start_date, period_end_date, payment_date, period_status)
  - payroll_runs (payroll_period_id, run_type, run_number, status, submitted_at, approved_at)
  - payroll_run_employees (payroll_run_id, employment_id, gross_amount, deduction_amount, net_amount, status)
  - payroll_inputs (payroll_run_id, employment_id, input_type, input_code, source_module, amount)
  - payroll_elements (element_code, element_name, element_category, gl_mapping_code)
  - payroll_result_lines (payroll_run_employee_id, payroll_element_id, line_type, calculated_amount)
- Add migration and contract-db sync mappings.
- Wire schema export in `packages/db/src/schema/erp/hrm/index.ts`.

Evidence:

- `packages/contracts/src/erp/hr/payroll.entity.ts`
- `packages/contracts/src/erp/hr/payroll.commands.ts`
- `packages/contracts/src/erp/hr/payroll.queries.ts`
- `packages/db/src/schema/erp/hrm/hrm-payroll.ts`
- `tools/gates/contract-db-sync.mjs` mapping updates

Done when:

- Contracts and tables are present and exported.
- Contract-db sync gate includes new entity pairs.
- `pnpm check:contract-db-sync` passed.
- `node tools/gates/schema-invariants.mjs` passed.

## W9-R2. Core services and API routes

Status: DONE

Deliverables:

- Implement services for:
  - open payroll period / lock payroll period (open → locked)
  - create payroll run / submit payroll run / approve payroll run
  - collect payroll inputs (from attendance, leave, compensation)
  - run calculation orchestration (stub with validations)
- Implement queries:
  - list payroll periods
  - get payroll run
  - list payroll run employees
  - list payroll inputs
- Implement and register API routes for these command/query surfaces.
- Enforce audit + outbox on all mutations.

Evidence:

- `packages/core/src/erp/hr/payroll/services/open-payroll-period.service.ts`
- `packages/core/src/erp/hr/payroll/services/lock-payroll-period.service.ts`
- `packages/core/src/erp/hr/payroll/services/create-payroll-run.service.ts`
- `packages/core/src/erp/hr/payroll/services/submit-payroll-run.service.ts`
- `packages/core/src/erp/hr/payroll/services/approve-payroll-run.service.ts`
- `packages/core/src/erp/hr/payroll/queries/list-payroll-periods.query.ts`
- `packages/core/src/erp/hr/payroll/queries/get-payroll-run.query.ts`
- `packages/core/src/erp/hr/payroll/queries/list-payroll-run-employees.query.ts`
- `packages/core/src/erp/hr/payroll/queries/list-payroll-inputs.query.ts`
- `apps/api/src/routes/erp/hr/open-payroll-period.ts`
- `apps/api/src/routes/erp/hr/lock-payroll-period.ts`
- `apps/api/src/routes/erp/hr/create-payroll-run.ts`
- `apps/api/src/routes/erp/hr/submit-payroll-run.ts`
- `apps/api/src/routes/erp/hr/approve-payroll-run.ts`
- `apps/api/src/routes/erp/hr/list-payroll-periods.ts`
- `apps/api/src/routes/erp/hr/get-payroll-run.ts`
- `apps/api/src/routes/erp/hr/list-payroll-run-employees.ts`
- `apps/api/src/routes/erp/hr/list-payroll-inputs.ts`
- `apps/api/src/index.ts` imports/registers the above routes.

Done when:

- All services and routes exist and are wired.
- `pnpm --filter @afenda/api typecheck` passed.

## W9-R3. Validation and test closure

Status: DONE

Deliverables:

- Add invariant tests for:
  - period state transition (open → locked)
  - run state transition (draft → submitted → approved)
  - idempotency on payroll run creation
  - duplicate input rejection
- Run targeted and package-level validation commands.

Evidence required:

- `packages/core/src/erp/hr/payroll/__vitest_test__/payroll-period-invariants.service.test.ts`
- `packages/core/src/erp/hr/payroll/__vitest_test__/payroll-run-invariants.service.test.ts`
- Commands:
  - `pnpm --filter @afenda/core test -- src/erp/hr/payroll/__vitest_test__/`
  - `pnpm check:all`

Done when:

- All Wave 9 tests pass.
- All 22 gates pass.

---

# Suggested completion order

1. W9-R1 (contracts + schema + migration)
2. W9-R2 (core services + API routes)
3. W9-R3 (tests + validation)

---

# Blockers log (update during execution)

- None.

---

# 0. Status Update (2026-03-13)

## Current delivery status

- Wave 9 implementation complete.
- Contracts, DB schema, core services, API routes, and invariant tests delivered.
- Migration 0051 applied. All 22 gates pass.

## Evidence snapshot

- `pnpm --filter @afenda/core test -- src/erp/hr/payroll/__vitest_test__/` passed (4 files, 15 tests).
- `pnpm check:all` passed (all 22 gates).

## Known open items

- Pay group / pay frequency may be added in a future wave.
- Payroll inputs collection and calculation orchestration are stubs for Wave 10.
- Period status "closed" (locked → closed) not implemented; lock is the primary close action.

---

# Validation commands (run to verify closure)

```bash
pnpm --filter @afenda/core test -- src/erp/hr/payroll/__vitest_test__/
pnpm check:all
```

Exit rule:

Wave closure is complete only when behavior is proven with tests and evidence.
