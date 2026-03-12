# Treasury Stabilization Audit - 2026-03-13

## Scope

- End-to-end validation across contracts, db, core, api, worker, and web for Treasury waves 0 through 6.2.
- Structural and behavioral verification with typecheck, gates, and Treasury-focused tests.
- Scaffold-path gap analysis against docs/treasury/treasury.multi-wave-scaffold.md.

## Verification Results

- contracts build: pass
- typecheck: pass for @afenda/core, @afenda/api, @afenda/worker, @afenda/web
- gates: pass (all gates report 0 violations)
- treasury core tests: pass (19 files, 111 tests)
- targeted post-fix treasury regression: pass (3 files, 20 tests)
- new treasury policy tests: pass (1 file, 3 tests)
- new treasury accounting bridge tests: pass (1 file, 2 tests)
- final scaffold parity: pass (171 listed, 0 missing exact paths)

## Stabilization Fix Applied

File updated:

- apps/worker/src/jobs/kernel/process-outbox-event.ts

Fixes:

- Added routing for previously un-routed Treasury events:
  - TREAS.RECONCILIATION_SESSION_OPENED
  - TREAS.RECONCILIATION_MATCH_ADDED
  - TREAS.RECONCILIATION_MATCH_REMOVED
  - TREAS.RECONCILIATION_SESSION_CLOSED
  - TREAS.PAYMENT_INSTRUCTION_CREATED
  - TREAS.PAYMENT_INSTRUCTION_SUBMITTED
  - TREAS.PAYMENT_INSTRUCTION_APPROVED
  - TREAS.PAYMENT_INSTRUCTION_REJECTED
  - TREAS.PAYMENT_BATCH_CREATED
  - TREAS.PAYMENT_BATCH_RELEASE_REQUESTED
  - TREAS.PAYMENT_BATCH_RELEASED
  - TREAS.CASH_POSITION_SNAPSHOT_REQUESTED
  - TREAS.CASH_POSITION_SNAPSHOT_SUPERSEDED
  - TREAS.LIQUIDITY_SCENARIO_CREATED
  - TREAS.LIQUIDITY_SCENARIO_ACTIVATED
  - TREAS.LIQUIDITY_FORECAST_CALCULATED
- Added missing break after revaluation dispatch case to avoid implicit fallthrough.
- Removed duplicate break in Wave 6.2 section.

Coverage delta:

- Before: emitted 53, routed 42, missing-in-router 16
- After: emitted 53, routed 58, missing-in-router 0

## Additional Test Coverage Added

File created:

- packages/core/src/erp/finance/treasury/**vitest_test**/treasury-policy.service.test.ts

Scenarios:

- policy code uniqueness conflict
- activate policy not found
- limit breach persistence and outbox emission

## Scaffold Gap Analysis

Scaffold inventory run (concrete paths only):

- listed: 171
- missing by exact path: 0

Closure summary:

- Added compatibility wrappers for naming-drift paths so scaffold parity is exact without breaking runtime routing.
- Implemented Wave 5.2 treasury accounting bridge baseline artifacts across contracts, db, core, worker, web, and tests.
- Added event routing and worker task registration for `TREAS.TREASURY_POSTING_REQUESTED`.

## Current Risk Posture

- High risk (fixed): missing worker routing for emitted Treasury outbox events.
- Medium risk (fixed): Wave 5.2 accounting bridge scaffold parity and baseline wiring now in place.
- Low risk (managed): compatibility wrappers preserve exact scaffold path parity while existing consolidated implementations remain intact.

## Recommended Next Stabilization Step

Monitor production-like flows for posting bridge throughput and add API route surfaces for accounting bridge commands/queries as a follow-up hardening increment.
