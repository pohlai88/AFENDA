# HRM Waves Closure Matrix

Date: 2026-03-13
Scope: AFENDA HRM Waves 1-12 (Phase 1-4)

## Summary

Waves 1-8 are closed for HR scope. Waves 9-12 have designated scaffolds and are PENDING.

## Wave-by-wave status

### Phase 1 (Waves 1-6)

1. Wave 1 — Status: DONE | File: `docs/hrm/hrm-wave1.scaffold.md` | Notes: Web delivery, seed data, test closure complete.

2. Wave 2 — Status: DONE | File: `docs/hrm/hrm-wave2.scaffold.md` | Notes: Repository parity and lifecycle route coverage complete.

3. Wave 3 — Status: DONE | File: `docs/hrm/hrm-wave3.scaffold.md` | Notes: Lifecycle and read-model hardening complete.

4. Wave 4 — Status: DONE | File: `docs/hrm/hrm-wave4.scaffold.md` | Notes: Recruitment/offboarding chain complete.

5. Wave 5 — Status: DONE | File: `docs/hrm/hrm-wave5.scaffold.md` | Notes: Write/read parity and Wave 5 invariants complete.

6. Wave 6 — Status: DONE | File: `docs/hrm/hrm-wave6.scaffold.md` | Notes: Organization lifecycle invariants; closure section supersedes legacy scaffold.

### Phase 2 (Waves 7-10)

7. Wave 7 — Status: DONE | File: `docs/hrm/hrm-wave7.scaffold.md` | Notes: Time, attendance, leave, ESS/MSS foundations complete.

8. Wave 8 — Status: DONE | File: `docs/hrm/hrm-wave8-plus-roadmap.md` | Notes: Compensation foundation (structures, packages, salary history, benefits) complete.

9. Wave 9 — Status: PENDING | File: `docs/hrm/hrm-wave9.scaffold.md` | Notes: Payroll foundation (calendars, periods, runs, inputs, result lines).

10. Wave 10 — Status: PENDING | File: `docs/hrm/hrm-wave10.scaffold.md` | Notes: Payroll integration (payslips, payment batch, GL posting).

### Phase 3 (Waves 11)

11. Wave 11 — Status: PENDING | File: `docs/hrm/hrm-wave11.scaffold.md` | Notes: Performance, talent, learning foundations.

### Phase 4 (Waves 12)

12. Wave 12 — Status: PENDING | File: `docs/hrm/hrm-wave12.scaffold.md` | Notes: Compliance, employee relations, workforce planning.

## New hardening delivered in this pass

- Added organization lifecycle invariants test:
  - `packages/core/src/erp/hr/organization/__vitest_test__/position-lifecycle.service.test.ts`
- Designated Wave 9-12 scaffold documents:
  - `docs/hrm/hrm-wave9.scaffold.md` | `docs/hrm/hrm-wave10.scaffold.md` | `docs/hrm/hrm-wave11.scaffold.md` | `docs/hrm/hrm-wave12.scaffold.md`

## Remaining gaps

- No HRM Wave 1-8 implementation blockers remain.
- Waves 9-12 are scaffolded and ready for implementation.

## Continuation policy

Use the same strict closure discipline for all next waves:

1. Close all discovered gaps regardless of blocking status.
2. Require implementation + tests + evidence before marking DONE.
3. Carry forward non-blocking findings only as explicit remediation entries with validation commands.

## Next execution docs

- Wave 9 scaffold: `docs/hrm/hrm-wave9.scaffold.md`
- Wave 10 scaffold: `docs/hrm/hrm-wave10.scaffold.md`
- Wave 11 scaffold: `docs/hrm/hrm-wave11.scaffold.md`
- Wave 12 scaffold: `docs/hrm/hrm-wave12.scaffold.md`
- Roadmap reference: `docs/hrm/hrm-wave8-plus-roadmap.md`
