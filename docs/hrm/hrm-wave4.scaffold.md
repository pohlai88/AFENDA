Below is the AFENDA HRM Phase 1 - Wave 4 implementation scaffold and closure tracker.

Wave 4 focus:

1. Requisition approval to application submission command chain
2. Offer issue and acceptance command chain
3. Onboarding task completion and offboarding closure command chain
4. API route completion for Wave 4 command endpoints

This wave covers recruitment-to-onboarding/offboarding operational continuity for Phase 1 workforce truth flow.

## Wave Status: DONE

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

- Wave ID: Wave 4
- Scope: Recruitment and onboarding/offboarding command and route closure
- Document role: Scaffold + closure tracker
- Last updated: 2026-03-12

---

# Remaining (Follow-up)

Use this as the active closure tracker for Wave 4.

Completion rule: a remaining item is only complete when implementation + tests + evidence are all present.

## W4-R1. Recruitment and offer command chain

Status: DONE

Deliverables:

- Approve requisition service and DTO.
- Submit application service and DTO.
- Issue offer and accept offer services and DTOs.
- Repository contracts for application/offer/requisition approval flows.

Evidence:

- `packages/core/src/erp/hr/recruitment/services/approve-requisition.service.ts`
- `packages/core/src/erp/hr/recruitment/services/submit-application.service.ts`
- `packages/core/src/erp/hr/recruitment/services/issue-offer.service.ts`
- `packages/core/src/erp/hr/recruitment/services/accept-offer.service.ts`
- `packages/core/src/erp/hr/recruitment/dto/approve-requisition.dto.ts`
- `packages/core/src/erp/hr/recruitment/dto/submit-application.dto.ts`
- `packages/core/src/erp/hr/recruitment/dto/issue-offer.dto.ts`
- `packages/core/src/erp/hr/recruitment/dto/accept-offer.dto.ts`
- `packages/core/src/erp/hr/recruitment/__vitest_test__/wave4-invariants.service.test.ts`

Done when:

- All Wave 4 recruitment/offer services and DTOs exist in core paths.
- Invariant tests validate the command chain behavior.

## W4-R2. Onboarding/offboarding command chain and API routes

Status: DONE

Deliverables:

- Complete onboarding task, clear exit item, and finalize separation services and DTOs.
- API routes for all Wave 4 commands.
- Registration wiring in API bootstrap.

Evidence:

- `packages/core/src/erp/hr/onboarding/services/complete-onboarding-task.service.ts`
- `packages/core/src/erp/hr/onboarding/services/clear-exit-item.service.ts`
- `packages/core/src/erp/hr/onboarding/services/finalize-separation.service.ts`
- `packages/core/src/erp/hr/onboarding/dto/complete-onboarding-task.dto.ts`
- `packages/core/src/erp/hr/onboarding/dto/clear-exit-item.dto.ts`
- `packages/core/src/erp/hr/onboarding/dto/finalize-separation.dto.ts`
- `apps/api/src/routes/erp/hr/approve-requisition.ts`
- `apps/api/src/routes/erp/hr/submit-application.ts`
- `apps/api/src/routes/erp/hr/issue-offer.ts`
- `apps/api/src/routes/erp/hr/accept-offer.ts`
- `apps/api/src/routes/erp/hr/complete-onboarding-task.ts`
- `apps/api/src/routes/erp/hr/clear-exit-item.ts`
- `apps/api/src/routes/erp/hr/finalize-separation.ts`
- `apps/api/src/index.ts`
- `packages/core/src/erp/hr/onboarding/__vitest_test__/wave4-invariants.service.test.ts`

Done when:

- All Wave 4 onboarding/offboarding services and command routes are present and wired.

## W4-R3. Validation and test closure

Status: DONE

Deliverables:

- Validate core and API compile for Wave 4 scope.
- Validate existing Wave 4 invariant tests.
- Record outputs and note test packaging decisions.

Evidence required:

- Test file list and mapping.
- Passing outputs for typecheck/test commands.

Done when:

- Required validation commands pass.
- Evidence is documented in this file.

## Suggested completion order

1. W4-R1
2. W4-R2
3. W4-R3

## Blockers log (update during execution)

- Legacy scaffold paths in the original Wave 4 doc used `packages/domain` and `apps/api/src/modules`; actual implementation is under `packages/core` and `apps/api/src/routes/erp/hr`.

---

# 0. Status Update (2026-03-12)

## Current delivery status

- Wave 4 implementation is complete in the active architecture paths.
- Recruitment, offer, onboarding, and separation command chain artifacts are present.
- API route endpoints for the Wave 4 command surface are implemented and registered.

## Evidence snapshot

### Functional implementation evidence

- Core services present for all 7 Wave 4 service targets in recruitment/onboarding modules.
- Core DTOs present for all Wave 4 command contracts.
- API routes present for all Wave 4 command endpoints.

### Build and test evidence

- `pnpm --filter @afenda/core typecheck` passed.
- `pnpm --filter @afenda/api typecheck` passed.
- `pnpm --filter @afenda/core test -- src/erp/hr/recruitment/__vitest_test__/wave4-invariants.service.test.ts src/erp/hr/onboarding/__vitest_test__/wave4-invariants.service.test.ts` passed (2 files, 4 tests).
- `pnpm --filter @afenda/api typecheck` passed on 2026-03-12.
- `pnpm --filter @afenda/core test -- src/erp/hr/recruitment/__vitest_test__/wave4-invariants.service.test.ts src/erp/hr/onboarding/__vitest_test__/wave4-invariants.service.test.ts` passed again (2 files, 4 tests) on 2026-03-12.
- Note: per-service test file names listed in the original scaffold are consolidated into `wave4-invariants.service.test.ts` files.

### Known open items

- None for Wave 4 scaffold scope.
- No Wave 4-specific blockers remain; track cross-wave verification in the latest HRM closure docs.

---

# 1. Recruitment command chain closure

Path hint: `packages/core/src/erp/hr/recruitment/`

Wave 4 recruitment flow is implemented for requisition approval, application submission, offer issuance, and offer acceptance.

Key files:

- `packages/core/src/erp/hr/recruitment/services/approve-requisition.service.ts`
- `packages/core/src/erp/hr/recruitment/services/submit-application.service.ts`
- `packages/core/src/erp/hr/recruitment/services/issue-offer.service.ts`
- `packages/core/src/erp/hr/recruitment/services/accept-offer.service.ts`
- `packages/core/src/erp/hr/recruitment/dto/approve-requisition.dto.ts`
- `packages/core/src/erp/hr/recruitment/dto/submit-application.dto.ts`
- `packages/core/src/erp/hr/recruitment/dto/issue-offer.dto.ts`
- `packages/core/src/erp/hr/recruitment/dto/accept-offer.dto.ts`
- `packages/core/src/erp/hr/recruitment/__vitest_test__/wave4-invariants.service.test.ts`

---

# 2. Onboarding/offboarding closure

Path hint: `packages/core/src/erp/hr/onboarding/`

Wave 4 onboarding/offboarding flow is implemented for onboarding task completion, exit-item clearing, and separation finalization.

Key files:

- `packages/core/src/erp/hr/onboarding/services/complete-onboarding-task.service.ts`
- `packages/core/src/erp/hr/onboarding/services/clear-exit-item.service.ts`
- `packages/core/src/erp/hr/onboarding/services/finalize-separation.service.ts`
- `packages/core/src/erp/hr/onboarding/dto/complete-onboarding-task.dto.ts`
- `packages/core/src/erp/hr/onboarding/dto/clear-exit-item.dto.ts`
- `packages/core/src/erp/hr/onboarding/dto/finalize-separation.dto.ts`
- `packages/core/src/erp/hr/onboarding/__vitest_test__/wave4-invariants.service.test.ts`

---

# 3. API route closure

Path hint: `apps/api/src/routes/erp/hr/`

Wave 4 API command routes are present and aligned with implemented core services.

Key files:

- `apps/api/src/routes/erp/hr/approve-requisition.ts`
- `apps/api/src/routes/erp/hr/submit-application.ts`
- `apps/api/src/routes/erp/hr/issue-offer.ts`
- `apps/api/src/routes/erp/hr/accept-offer.ts`
- `apps/api/src/routes/erp/hr/complete-onboarding-task.ts`
- `apps/api/src/routes/erp/hr/clear-exit-item.ts`
- `apps/api/src/routes/erp/hr/finalize-separation.ts`
- `apps/api/src/index.ts`

---

# N. Next exact batch to build

Current wave completion summary:

- Functional status: DONE
- Quality status: DONE
- Program dependency status: Wave 4 no longer blocks next HRM slices.

Next batch:

1. Wave 5 web UX integration for the Wave 4 command chain in ERP HR pages.
2. End-to-end scenario tests across `requisition -> offer -> onboarding -> separation`.
3. Seed/demo datasets and observability dashboards for HRM flow explainability.

Exit rule:

Phase closure is complete only when behavior is proven with tests and evidence.
