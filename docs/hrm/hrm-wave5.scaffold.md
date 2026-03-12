Below is the AFENDA HRM Phase 1 - Wave 5 implementation scaffold and closure tracker.

Wave 5 focus:

1. Recruitment and interview workflow parity (write + read)
2. Onboarding and separation explainable read models
3. Employment timeline reviewability
4. API parity and compatibility validation

This wave covers explainable and reviewable HRM lifecycle behavior for Phase 1 so workflow actions are visible, auditable, and queryable.

---

# Directory Hints

- Database schema paths: `packages/db/src/schema/erp/hrm/`
- Core domain paths: `packages/core/src/erp/hr/`
- API route paths: `apps/api/src/routes/erp/hr/`
- Web app paths: `apps/web/src/app/(erp)/hr/`
- Tests paths: `**/__vitest_test__/` and app-level test folders
- Wave docs paths: `docs/hrm/`

Use these hints when populating file-level sections below.

---

# Wave Metadata

- Wave ID: Wave 5
- Scope: Explainable/reviewable HRM surfaces (recruitment, onboarding/separation, employment timeline) and route parity
- Document role: Scaffold + closure tracker
- Last updated: 2026-03-12

---

# Remaining (Follow-up)

Use this as the active closure tracker for Wave 5.

Completion rule: a remaining item is only complete when implementation + tests + evidence are all present.

## WX-R1. Wave 5 implementation parity (commands/queries/routes)

Status: DONE

Deliverables:

- Wave 5 write-path parity for schedule interview, submit feedback, and probation review.
- Wave 5 read-path parity for candidate pipeline, onboarding checklist, separation case, and employment timeline.
- API response/request schema parity in active route paths.

Evidence:

- `packages/core/src/erp/hr/recruitment/services/schedule-interview.service.ts`
- `packages/core/src/erp/hr/recruitment/services/submit-interview-feedback.service.ts`
- `packages/core/src/erp/hr/onboarding/services/record-probation-review.service.ts`
- `packages/core/src/erp/hr/recruitment/queries/get-candidate-pipeline.query.ts`
- `packages/core/src/erp/hr/onboarding/queries/get-onboarding-checklist.query.ts`
- `packages/core/src/erp/hr/onboarding/queries/get-separation-case.query.ts`
- `packages/core/src/erp/hr/core/queries/get-employment-timeline.query.ts`
- `apps/api/src/routes/erp/hr/schedule-interview.ts`
- `apps/api/src/routes/erp/hr/submit-feedback.ts`
- `apps/api/src/routes/erp/hr/record-probation-review.ts`
- `apps/api/src/routes/erp/hr/get-candidate-pipeline.ts`
- `apps/api/src/routes/erp/hr/get-onboarding-checklist.ts`
- `apps/api/src/routes/erp/hr/get-separation-case.ts`
- `apps/api/src/routes/erp/hr/get-employment-timeline.ts`

Done when:

- All Wave 5 write/read files exist in active architecture paths.
- Route parity exists under `apps/api/src/routes/erp/hr/`.

## WX-R2. Next-batch readiness validation against actual codebase

Status: DONE

Deliverables:

- Validate whether previously listed "next scaffold batch" items already exist.
- Identify true remaining gaps.

Evidence:

- Already implemented:
  - `packages/core/src/erp/hr/recruitment/queries/list-requisitions.query.ts`
  - `packages/core/src/erp/hr/recruitment/queries/get-application.query.ts`
  - `packages/core/src/erp/hr/onboarding/queries/list-pending-onboarding.query.ts`
  - `packages/core/src/erp/hr/organization/queries/get-org-tree.query.ts`
  - `packages/core/src/erp/hr/organization/services/assign-position.service.ts`
  - `apps/api/src/routes/erp/hr/list-requisitions.ts`
  - `apps/api/src/routes/erp/hr/get-application.ts`
  - `apps/api/src/routes/erp/hr/list-pending-onboarding.ts`
  - `apps/api/src/routes/erp/hr/get-org-tree.ts`
  - `packages/db/src/seeds/hrm/seed-hrm-org-units.ts`
  - `packages/db/src/seeds/hrm/seed-hrm-jobs.ts`
  - `packages/db/src/seeds/hrm/seed-hrm-job-grades.ts`
  - `packages/db/src/seeds/hrm/seed-hrm-positions.ts`
  - `packages/db/src/seeds/hrm/seed-hrm-requisition-templates.ts`
  - `packages/db/src/seeds/hrm/seed-hrm-onboarding-task-templates.ts`
- Validation closure now added:
  - `packages/core/src/erp/hr/recruitment/__vitest_test__/wave5-invariants.service.test.ts`
  - `packages/core/src/erp/hr/onboarding/__vitest_test__/wave5-invariants.service.test.ts`
  - `packages/core/src/erp/hr/core/__vitest_test__/wave5-invariants.service.test.ts`

Done when:

- Remaining list reflects actual missing items only.

## WX-R3. Validation and test closure

Status: DONE

Deliverables:

- Add tests for Wave 5 features (compatibility/read-model coverage complete).
- Record validation command outputs.

Evidence required:

- Test file list and mapping:
  - `packages/core/src/erp/hr/recruitment/__vitest_test__/wave5-write-compat.service.test.ts`
  - `packages/core/src/erp/hr/recruitment/__vitest_test__/wave5-read-models.query.test.ts`
  - `packages/core/src/erp/hr/recruitment/__vitest_test__/wave5-invariants.service.test.ts`
  - `packages/core/src/erp/hr/onboarding/__vitest_test__/wave5-probation-compat.service.test.ts`
  - `packages/core/src/erp/hr/onboarding/__vitest_test__/wave5-read-models.query.test.ts`
  - `packages/core/src/erp/hr/onboarding/__vitest_test__/wave5-invariants.service.test.ts`
  - `packages/core/src/erp/hr/core/__vitest_test__/wave5-read-models.query.test.ts`
  - `packages/core/src/erp/hr/core/__vitest_test__/wave5-invariants.service.test.ts`
- Passing outputs:
  - `pnpm --filter @afenda/core exec vitest run src/erp/hr/recruitment/__vitest_test__/wave5-write-compat.service.test.ts src/erp/hr/recruitment/__vitest_test__/wave5-read-models.query.test.ts src/erp/hr/recruitment/__vitest_test__/wave5-invariants.service.test.ts src/erp/hr/onboarding/__vitest_test__/wave5-probation-compat.service.test.ts src/erp/hr/onboarding/__vitest_test__/wave5-read-models.query.test.ts src/erp/hr/onboarding/__vitest_test__/wave5-invariants.service.test.ts src/erp/hr/core/__vitest_test__/wave5-read-models.query.test.ts src/erp/hr/core/__vitest_test__/wave5-invariants.service.test.ts`
  - Result: 8 files passed, 12 tests passed (2026-03-12)
  - `pnpm typecheck`
  - Result: success across in-scope packages via turbo (2026-03-12)

Done when:

- Required validation commands pass.
- Evidence is documented in this file.
- Wave 5 invariant tests are added.

## Suggested completion order

1. WX-R2
2. WX-R3

## Blockers log (update during execution)

- No technical blockers identified.
- Scope blocker: Wave 5 invariant test suite not yet created as dedicated set.

---

# 0. Status Update (2026-03-12)

## Current delivery status

- Wave 5 functional implementation is complete in active architecture (`packages/core` + `apps/api/src/routes`).
- The previously proposed "next batch" is mostly already implemented in this repository.
- Wave 5 invariant coverage is now present across recruitment, onboarding, and core transitions.

## Evidence snapshot

### Functional implementation evidence

- Command/query/route Wave 5 parity files are present and wired.
- Next-batch query surfaces and seeders already exist.

### Build and test evidence

- Typecheck: `pnpm typecheck` passed on 2026-03-12.
- Wave 5 targeted tests: 8 files passed, 12 tests passed on 2026-03-12.
- Full gate run (`pnpm check:all`) executed on 2026-03-12.
- Gate result: all 22 gates passed.
- Note on finance gate in local dev: `journal-balance` and `idempotency` are currently skipped when API test infrastructure (DB) is unavailable; gate still passes with remaining critical finance tests (`posting`, `money`).

### Known open items

- Optional hardening: run API finance integration invariants with DB available to exercise `journal-balance` and `idempotency` in full.

---

# 1. Wave 5 Write + Read Parity

Path hint: `packages/core/src/...` and `apps/api/src/...`

Validated implemented surfaces:

- Write services:
  - `packages/core/src/erp/hr/recruitment/services/schedule-interview.service.ts`
  - `packages/core/src/erp/hr/recruitment/services/submit-interview-feedback.service.ts`
  - `packages/core/src/erp/hr/onboarding/services/record-probation-review.service.ts`
- Read queries:
  - `packages/core/src/erp/hr/recruitment/queries/get-candidate-pipeline.query.ts`
  - `packages/core/src/erp/hr/onboarding/queries/get-onboarding-checklist.query.ts`
  - `packages/core/src/erp/hr/onboarding/queries/get-separation-case.query.ts`
  - `packages/core/src/erp/hr/core/queries/get-employment-timeline.query.ts`
- API routes:
  - `apps/api/src/routes/erp/hr/schedule-interview.ts`
  - `apps/api/src/routes/erp/hr/submit-feedback.ts`
  - `apps/api/src/routes/erp/hr/record-probation-review.ts`
  - `apps/api/src/routes/erp/hr/get-candidate-pipeline.ts`
  - `apps/api/src/routes/erp/hr/get-onboarding-checklist.ts`
  - `apps/api/src/routes/erp/hr/get-separation-case.ts`
  - `apps/api/src/routes/erp/hr/get-employment-timeline.ts`

---

# 2. Next-Batch Validation Against Actual Codebase

Path hint: `packages/core/src/...`, `apps/api/src/...`, `packages/db/src/...`

Validated as already implemented:

- Queries:
  - `packages/core/src/erp/hr/recruitment/queries/list-requisitions.query.ts`
  - `packages/core/src/erp/hr/recruitment/queries/get-application.query.ts`
  - `packages/core/src/erp/hr/onboarding/queries/list-pending-onboarding.query.ts`
  - `packages/core/src/erp/hr/organization/queries/get-org-tree.query.ts`
- Service hardening anchor:
  - `packages/core/src/erp/hr/organization/services/assign-position.service.ts`
- API routes:
  - `apps/api/src/routes/erp/hr/list-requisitions.ts`
  - `apps/api/src/routes/erp/hr/get-application.ts`
  - `apps/api/src/routes/erp/hr/list-pending-onboarding.ts`
  - `apps/api/src/routes/erp/hr/get-org-tree.ts`
- Seeders:
  - `packages/db/src/seeds/hrm/seed-hrm-org-units.ts`
  - `packages/db/src/seeds/hrm/seed-hrm-jobs.ts`
  - `packages/db/src/seeds/hrm/seed-hrm-job-grades.ts`
  - `packages/db/src/seeds/hrm/seed-hrm-positions.ts`
  - `packages/db/src/seeds/hrm/seed-hrm-requisition-templates.ts`
  - `packages/db/src/seeds/hrm/seed-hrm-onboarding-task-templates.ts`

Remaining from this batch intent:

- No remaining implementation gaps were found in the previously proposed next batch.

---

# 3. Test and Validation Mapping

Path hint: `packages/core/src/**/__vitest_test__/`

Wave 5 test evidence currently present:

- Write compatibility:
  - `packages/core/src/erp/hr/recruitment/__vitest_test__/wave5-write-compat.service.test.ts`
  - `packages/core/src/erp/hr/onboarding/__vitest_test__/wave5-probation-compat.service.test.ts`
- Read-model compatibility:
  - `packages/core/src/erp/hr/recruitment/__vitest_test__/wave5-read-models.query.test.ts`
  - `packages/core/src/erp/hr/onboarding/__vitest_test__/wave5-read-models.query.test.ts`
  - `packages/core/src/erp/hr/core/__vitest_test__/wave5-read-models.query.test.ts`
- Invariants:
  - `packages/core/src/erp/hr/recruitment/__vitest_test__/wave5-invariants.service.test.ts`
  - `packages/core/src/erp/hr/onboarding/__vitest_test__/wave5-invariants.service.test.ts`
  - `packages/core/src/erp/hr/core/__vitest_test__/wave5-invariants.service.test.ts`

Execution evidence:

- Core targeted wave tests: 8 files passed, 12 tests passed (2026-03-12)
- Typecheck: success via turbo (2026-03-12)

---

# N. Next exact batch to build

Current wave completion summary:

- Functional status: DONE
- Quality status: DONE (wave tests green; repository gates green)
- Program dependency status: No blocking dependencies found

Next batch:

1. Optional hardening: run API finance integration invariants with local DB to validate non-skipped coverage.
2. Start the next HRM wave using the validated remaining backlog.
3. Keep CI gate baseline green while implementing next-wave scope.

Exit rule:

Phase closure is complete only when behavior is proven with tests and evidence.
