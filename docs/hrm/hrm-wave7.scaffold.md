Below is the AFENDA HRM Phase 2 - Wave 7 implementation scaffold and closure tracker.

Wave 7 focus:

1. Time and attendance foundation (calendar, holiday, shift, roster, attendance)
2. Leave foundation (types, balances, requests, approval flow)
3. ESS and MSS route surfaces for operational workforce actions
4. Invariants and handoff preparation for payroll input readiness

This wave starts Phase 2 operations after Waves 1-6 closure.

## Wave Status: TODO

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

- Wave ID: Wave 7
- Scope: Time, attendance, leave, and operational ESS/MSS foundations
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

## W7-R1. Contracts and schema foundation

Status: TODO

Deliverables:

- Add contracts for attendance and leave entities/commands/queries.
- Add DB schema files and index wiring for:
  - work calendars, holidays, shifts, roster assignments
  - attendance records, timesheet entries
  - leave types, leave balances, leave requests
- Add migration and contract-db sync mappings.

Evidence:

- `packages/contracts/src/erp/hr/...`
- `packages/db/src/schema/erp/hrm/hrm-attendance.ts`
- `packages/db/src/schema/erp/hrm/hrm-leave.ts`
- `tools/gates/contract-db-sync.mjs` mapping updates

Done when:

- Contracts and tables are present and exported.
- Contract-db sync gate includes new entity pairs.
- Typecheck and schema gates pass.

## W7-R2. Core services and API routes

Status: TODO

Deliverables:

- Implement services for:
  - assign shift / create roster assignment
  - import attendance / record attendance event
  - create leave request / approve leave request
  - recalculate leave balance
- Implement and register API routes for these command/query surfaces.
- Enforce audit + outbox on all mutations.

Evidence:

- `packages/core/src/erp/hr/attendance/services/*.ts`
- `packages/core/src/erp/hr/leave/services/*.ts`
- `apps/api/src/routes/erp/hr/*attendance*.ts`
- `apps/api/src/routes/erp/hr/*leave*.ts`

Done when:

- Command and query route coverage is complete for Wave 7 scope.
- Audit and outbox patterns are verified in code and tests.

## W7-R3. ESS/MSS operational UI surfaces

Status: TODO

Deliverables:

- Add operational HR screens:
  - attendance dashboard
  - shift/roster admin
  - leave request and leave approval queue
- Add loading, error, and empty states for each route.
- Wire API client helpers and query keys for attendance/leave.

Evidence:

- `apps/web/src/app/(erp)/hr/attendance/`
- `apps/web/src/app/(erp)/hr/leave/`
- `apps/web/src/app/(erp)/hr/shared/`

Done when:

- Route surfaces render and compile.
- State pages exist and pass page-state gate checks.

## W7-R4. Validation and closure

Status: TODO

Deliverables:

- Add invariant tests for overlap/approval/ledger-style state transitions.
- Run targeted and package-level validation commands.
- Document pass outputs and remaining non-blocking remediation items.

Evidence required:

- New tests under `packages/core/src/erp/hr/**/__vitest_test__/`
- Commands:
  - `pnpm --filter @afenda/core test -- ...`
  - `pnpm --filter @afenda/api typecheck`
  - `pnpm check:contract-db-sync`
  - `pnpm check:schema-invariants`

Done when:

- Wave 7 targeted tests pass.
- Typecheck and relevant gates pass.
- This file includes completion evidence and open-item register.

---

# 0. Status Update (2026-03-13)

## Current delivery status

- Wave 7 is not started; this document is the active scaffold and tracker.
- Waves 1-6 are already closed for HR scope.

## Known open items

- Wave 7 backlog not yet implemented.
- Payroll-input readiness from attendance/leave is pending this wave.

---

# Next exact batch to build

1. Contracts + schema files for attendance/leave.
2. Core service skeletons + route registrations.
3. First invariant tests for leave approval and roster overlap.

Exit rule:

Wave closure is complete only when behavior is proven with tests and evidence.
