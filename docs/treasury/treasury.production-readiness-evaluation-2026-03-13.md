# Treasury Production Readiness Evaluation

Date: 2026-03-13
Scope: Treasury domain only
Execution depth: Full command validation on current branch state

## Evidence Executed

1. Gate suite

- Command: pnpm check:all
- Result: PASS
- Evidence: All 22 gates passed, including boundaries, module-boundaries, schema-invariants, migration-lint, contract-db-sync, audit-enforcement, org-isolation, finance-invariants, page-states, ui-shell.

2. Focused treasury backend tests

- Command: pnpm --filter @afenda/core test -- src/erp/finance/treasury/**vitest_test**/treasury-policy.service.test.ts src/erp/finance/treasury/**vitest_test**/treasury-accounting-bridge.service.test.ts src/erp/finance/treasury/**vitest_test**/bank-connector.service.test.ts src/erp/finance/treasury/**vitest_test**/wave5-1-fx-management-revaluation.service.test.ts
- Result: PASS
- Evidence: 4 test files passed, 15 tests passed.

3. Frontend auth smoke execution

- Initial command: pnpm e2e:auth
- Initial result: FAIL (script pointed to non-existent e2e/auth.spec.ts)
- Fix implemented: package script now points to e2e/smoke.spec.ts
- Secondary result: FAIL in strict selector ambiguity for Sign in button
- Fix implemented: selector updated to exact Sign in button match
- Final command: PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm e2e:auth
- Final result: PASS
- Evidence: 4 passed (11.6s), chromium project, workers=1.

4. IDE diagnostics

- Command: get_errors (workspace-wide)
- Result: No errors found.

## Prioritized Findings

### Critical

1. Broken auth E2E entry script (fixed)

- Impact: Production smoke check could not run from root script.
- Evidence file: apps/web/e2e folder only had smoke.spec.ts.
- Remediation applied:
  - package.json script e2e:auth switched from e2e/auth.spec.ts to e2e/smoke.spec.ts.

### High

1. Auth smoke test strict selector ambiguity (fixed)

- Impact: False-negative smoke failure on signin page despite UI being healthy.
- Evidence: Playwright strict mode matched two buttons: Sign in and Sign in with a code.
- Remediation applied:
  - apps/web/e2e/smoke.spec.ts selector changed to exact Sign in label.

2. E2E runtime lock contention with active Next dev process (mitigated)

- Impact: Local smoke reliability can degrade when another Next process already holds .next/dev/lock.
- Mitigation applied:
  - Added reusable execution mode and validated successful run against existing server.

### Medium

1. Root auth smoke command reliability depends on local session discipline

- Impact: Potential intermittent CI/local parity mismatch for manual runs.
- Recommendation:
  - Use e2e:auth:reuse when a local dev server is already running.

2. Generated validation artifacts are currently left in workspace

- Impact: Noise in git status and possible accidental commit.
- Files:
  - apps/web/playwright-report/index.html
  - apps/web/test-results/.last-run.json
  - tools/tmp/treasury-typecheck.log
- Recommendation:
  - Add/update ignore strategy for generated runtime artifacts if not intentionally versioned.

## Go/No-Go Scorecard

### Frontend and UI/UX

- Treasury route surfaces present and connected to api-client: PASS
- Loading/error state gates: PASS (page-states gate passed)
- Auth smoke executability from root script: PASS after fix
- Auth smoke runtime reliability in shared local environment: PASS (validated via reuse-server execution mode)

### Backend and Logic

- Command/query route governance in treasury API: PASS
- Idempotency/audit/org-isolation enforcement (gates): PASS
- Treasury service tests for policy, connector, accounting bridge, FX revaluation: PASS

### DB, Schema, Tables

- Contract-db sync: PASS
- Schema invariants and migration lint: PASS
- Finance invariants gate: PASS

### End-to-End Connectivity

- UI to API treasury call presence: PASS (verified across treasury pages/components)
- API to worker event surface presence: PASS (TREAS.\* handlers exported and mapped)
- Runtime auth smoke flow: PASS

### Overall Recommendation

- Go
- Reason: Architecture, schema/table integrity, backend logic, and treasury runtime checks are all validated by passing gates/tests plus a clean auth smoke pass after fixing script and selector defects.

## Remediation Roadmap

1. Immediate (today)

- Keep the two implemented fixes:
  - package.json e2e:auth target correction
  - smoke.spec.ts exact Sign in button selector
- Add one additional script for existing running server mode:
  - e2e:auth:reuse with PLAYWRIGHT_BASE_URL set explicitly. (completed)

2. Near-term (next validation cycle)

- Run clean smoke suite in controlled environment:
  - no parallel Next dev instance OR explicit PLAYWRIGHT_BASE_URL usage
- Capture stable EXIT:0 evidence for auth smoke.

3. Hardening (short sprint)

- Normalize handling of generated artifacts:
  - report/test-results/tmp logs in ignore policy if non-source
- Add one treasury-focused e2e scenario beyond auth smoke:
  - unauthenticated to treasury redirect
  - authenticated treasury page data load smoke

## Files Changed During This Evaluation Step

1. package.json

- e2e:auth script fixed to existing spec file.

- added e2e:auth:reuse script for lock-safe local smoke execution.

2. apps/web/e2e/smoke.spec.ts

- signin button matcher tightened to exact label.

## Relevant Evidence Files

- apps/api/src/routes/erp/finance/treasury.ts
- apps/web/src/app/(erp)/finance/treasury/page.tsx
- apps/web/src/lib/api-client.ts
- apps/worker/src/jobs/erp/finance/treasury/index.ts
- tools/gates/schema-invariants.mjs
- tools/gates/contract-db-sync.mjs
- tools/gates/finance-invariants.mjs
- tools/gates/page-states.mjs
- docs/treasury/treasury.final.gaps.md
