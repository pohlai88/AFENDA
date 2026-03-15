Below is the AFENDA HRM Phase 2 - Wave 7 implementation scaffold and closure tracker.

Wave 7 focus:

1. Time and attendance foundation (calendar, holiday, shift, roster, attendance)
2. Leave foundation (types, balances, requests, approval flow)
3. ESS and MSS route surfaces for operational workforce actions
4. Invariants and handoff preparation for payroll input readiness

This wave starts Phase 2 operations after Waves 1-6 closure.

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

Status: DONE

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
- Validation evidence:
  - `pnpm check:contract-db-sync` passed (0 violations)
  - `node tools/gates/schema-invariants.mjs` passed (0 violations)

Done when:

- Contracts and tables are present and exported.
- Contract-db sync gate includes new entity pairs.
- Typecheck and schema gates pass.

## W7-R2. Core services and API routes

Status: DONE

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

Current evidence snapshot:

- Implemented services include:
  - `record-attendance.service.ts`
  - `create-roster-assignment.service.ts`
  - `create-leave-request.service.ts`
  - `approve-leave-request.service.ts`
  - `recalculate-leave-balance.service.ts`
- Implemented API routes include:
  - `record-attendance.ts`
  - `list-attendance-records.ts`
  - `list-roster-assignments.ts`
  - `create-roster-assignment.ts`
  - `create-leave-request.ts`
  - `approve-leave-request.ts`
  - `recalculate-leave-balance.ts`
  - `list-leave-requests.ts`
  - `list-leave-balances.ts`
- Route registration evidence:
  - `apps/api/src/index.ts` imports/registers the above routes.
- Validation evidence:
  - `pnpm --filter @afenda/api typecheck` passed.
  - write-path evidence tests added for attendance/leave audit + outbox behavior.

## W7-R3. ESS/MSS operational UI surfaces

Status: DONE

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

Current evidence snapshot:

- Attendance surfaces present:
  - `apps/web/src/app/(erp)/hr/attendance/records/page.tsx`
  - `apps/web/src/app/(erp)/hr/attendance/roster/page.tsx`
  - route-level `loading.tsx`/`error.tsx` files
- Leave surfaces present:
  - `apps/web/src/app/(erp)/hr/leave/requests/page.tsx`
  - `apps/web/src/app/(erp)/hr/leave/approvals/page.tsx`
  - `apps/web/src/app/(erp)/hr/leave/balances/page.tsx`
  - route-level `loading.tsx`/`error.tsx` files
- Shared integration scaffolding present:
  - `apps/web/src/app/(erp)/hr/shared/hrm-client.ts`
  - `apps/web/src/app/(erp)/hr/shared/hrm-query-keys.ts`
- Data binding evidence:
  - Attendance pages now call attendance/roster list APIs and render live table data.
  - Leave pages now call leave request/balance APIs and render live table data.

## W7-R4. Validation and closure

Status: DONE

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
  - `node tools/gates/schema-invariants.mjs`

Validation snapshot:

- `pnpm --filter @afenda/core test -- src/erp/hr/attendance/__vitest_test__/roster-assignment.service.test.ts src/erp/hr/attendance/__vitest_test__/record-attendance.audit-outbox.test.ts src/erp/hr/leave/__vitest_test__/leave-approval.service.test.ts src/erp/hr/leave/__vitest_test__/recalculate-leave-balance.service.test.ts src/erp/hr/leave/__vitest_test__/create-leave-request.audit-outbox.test.ts` passed (5 files, 8 tests).
- `pnpm --filter @afenda/web test -- src/lib/__vitest_test__/hrm-client.integration.test.ts` passed (1 file, 3 tests).
- `pnpm check:contract-db-sync` passed (0 violations).
- `node tools/gates/schema-invariants.mjs` passed (0 violations).
- `pnpm --filter @afenda/api typecheck` now passes after HR response-envelope typing fixes.
- Editor diagnostics check reports no errors for updated API/web/core files.

---

# 0. Status Update (2026-03-13)

## Current delivery status

- Contracts and DB schema foundations for attendance/leave are delivered and validated.
- Core services and API routes for attendance/leave command and read-model surfaces are implemented and registered.
- ESS/MSS attendance and leave route surfaces are data-bound to API responses (not placeholder cards).
- Shared HR API helpers and query keys for attendance/leave are present.
- Targeted Wave 7 core tests pass (8/8) and HR web client integration tests pass (3/3).
- Contract-db sync and schema invariants checks pass.
- API package typecheck passes for the Wave 7 route set after response-envelope fixes.

## Known open items

- No Wave 7 blockers remain.
- Optional follow-up: add browser-level E2E coverage for attendance/leave happy-path interactions.

## Delta progress (this increment)

- Added roster list query in core and new API route registration.
- Replaced Wave 7 attendance/leave placeholder pages with data-bound table views.
- Added HR web client integration tests for attendance/leave/roster API paths.
- Added explicit attendance and leave write-path audit/outbox evidence tests.
- Revalidated typecheck and schema/contract gates.

## Newly added evidence (this increment)

- `packages/core/src/erp/hr/attendance/queries/list-roster-assignments.query.ts`
- `apps/api/src/routes/erp/hr/list-roster-assignments.ts`
- `apps/web/src/app/(erp)/hr/attendance/records/page.tsx`
- `apps/web/src/app/(erp)/hr/attendance/roster/page.tsx`
- `apps/web/src/app/(erp)/hr/leave/requests/page.tsx`
- `apps/web/src/app/(erp)/hr/leave/approvals/page.tsx`
- `apps/web/src/app/(erp)/hr/leave/balances/page.tsx`
- `apps/web/src/lib/__vitest_test__/hrm-client.integration.test.ts`
- `packages/core/src/erp/hr/attendance/__vitest_test__/record-attendance.audit-outbox.test.ts`
- `packages/core/src/erp/hr/leave/__vitest_test__/create-leave-request.audit-outbox.test.ts`

---

# Next exact batch to build

1. Start Wave 8 scope from `docs/hrm/hrm-wave8-plus-roadmap.md`.
2. Optional: add browser E2E coverage for leave request submission and approval loop.
3. Optional: add richer filters and pagination controls to attendance/leave tables.

Exit rule:

Wave closure is complete only when behavior is proven with tests and evidence.
