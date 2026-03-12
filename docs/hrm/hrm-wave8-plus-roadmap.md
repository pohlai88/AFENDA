# HRM Remaining Roadmap (Post Wave 7)

Date: 2026-03-13
Scope: AFENDA HRM continuation plan after Wave 7

## Objective

Provide a practical continuation map so development can proceed without reopening closed Wave 1-6 decisions.

## Wave 8 (Compensation Foundation)

Focus:

1. Compensation structures and employee packages
2. Salary change history and effective dating
3. Benefit plan and enrollment baseline

Target artifacts:

- Contracts: compensation entities and commands
- DB: `hrm-compensation.ts`
- Core: compensation services + queries
- API: compensation routes
- Tests: compensation invariants

## Wave 9 (Payroll Foundation)

Focus:

1. Payroll calendars/periods and pay groups
2. Payroll input management
3. Payroll run + result line baseline

Target artifacts:

- Contracts: payroll events and command/query contracts
- DB: `hrm-payroll.ts`
- Core: calculation orchestration stubs with validations
- API: payroll control routes
- Tests: period state transition and idempotency invariants

## Wave 10 (Payroll Integration + Finance Handoff)

Focus:

1. Payslip publication
2. Payment batch generation
3. GL posting integration

Target artifacts:

- Core: payroll-to-GL mapping services
- API: publish/approve/post routes
- Worker: asynchronous posting and retry logic
- Tests: accounting integrity and posting invariants

## Wave 11 (Performance + Talent + Learning)

Focus:

1. Performance cycle and review records
2. Talent profile and succession baseline
3. Learning catalog and enrollment baseline

Target artifacts:

- Core modules for performance/talent/learning
- Initial read models and manager review surfaces
- Invariant tests for workflow transitions

## Wave 12 (Compliance + Relations + Planning)

Focus:

1. Policy acknowledgement and compliance checks
2. Employee relations case handling
3. Workforce planning and headcount projection

Target artifacts:

- Compliance/relation/planning contracts and schemas
- Route surfaces and query dashboards
- Evidence retention and audit hardening

## Cross-wave non-negotiables

1. Keep schema-is-truth order: contracts -> db -> migration -> core -> api -> worker -> web -> tests.
2. Every mutation must keep audit + outbox discipline.
3. Every wave must run targeted tests and relevant gates before closure.
4. Close all discovered gaps, including non-blocking items, before promoting wave status to DONE.

## Suggested operating cadence

1. Start each wave with scaffold + explicit remaining tracker.
2. Maintain a closure matrix update at wave end.
3. Record commands, test output, and evidence links in the wave doc itself.
