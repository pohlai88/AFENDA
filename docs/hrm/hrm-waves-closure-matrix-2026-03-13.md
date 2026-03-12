# HRM Waves Closure Matrix

Date: 2026-03-13
Scope: AFENDA HRM Phase 1 Waves 1-6

## Summary

All six HRM waves are closed for HR scope.

## Wave-by-wave status

1. Wave 1
- Status: DONE
- File: `docs/hrm/hrm-wave1.scaffold.md`
- Notes: Web delivery, seed data, test closure, and sign-off marked complete.

2. Wave 2
- Status: DONE
- File: `docs/hrm/hrm-wave2.scaffold.md`
- Notes: Repository parity and lifecycle route coverage complete.

3. Wave 3
- Status: DONE
- File: `docs/hrm/hrm-wave3.scaffold.md`
- Notes: Lifecycle and read-model hardening complete; stale open-items note removed.

4. Wave 4
- Status: DONE
- File: `docs/hrm/hrm-wave4.scaffold.md`
- Notes: Recruitment/offboarding chain complete; stale cross-wave blocker note normalized.

5. Wave 5
- Status: DONE
- File: `docs/hrm/hrm-wave5.scaffold.md`
- Notes: Write/read parity and Wave 5 invariants complete; no HRM blocking open items.

6. Wave 6
- Status: DONE (closure update)
- File: `docs/hrm/hrm-wave6.scaffold.md`
- Notes: Superseding closure section added; legacy scaffold content retained for traceability.

## New hardening delivered in this pass

- Added organization lifecycle invariants test:
  - `packages/core/src/erp/hr/organization/__vitest_test__/position-lifecycle.service.test.ts`
- Validation evidence:
  - `pnpm --filter @afenda/core test -- src/erp/hr/organization/__vitest_test__/position-lifecycle.service.test.ts src/erp/hr/core/__vitest_test__/wave5-invariants.service.test.ts` passed (2 files, 6 tests)
  - `pnpm --filter @afenda/core typecheck` passed

## Remaining gaps

- No HRM Wave 1-6 implementation blockers remain.
- Optional platform hardening (outside HRM wave scope) may still be run separately.
