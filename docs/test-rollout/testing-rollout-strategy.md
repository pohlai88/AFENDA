# Testing Rollout Strategy (Vitest + Playwright)

## Purpose

This document turns test configuration into an operational rollout plan with ownership, staged enforcement, and measurable outcomes.

## Scope

- Unit tests (Vitest) across apps and packages
- Coverage collection and thresholds (Vitest)
- E2E tests (Playwright)
- CI workflow tiering for PR vs main

## Owners

- Platform Engineering (Primary)
  - Owns CI workflow, branch protection, runner performance, and artifact retention
- Domain Package Owners (Secondary)
  - Own test health and coverage quality in their package/app
- QA / Product Engineering (Secondary)
  - Owns Playwright smoke and critical path suites

## Timeline

### Phase 0: Baseline and Contracts (Week 1)

- Goals:
  - Ensure every Vitest package/app has `test` and `test:coverage` script contracts
  - Ensure root coverage command fan-outs deterministically
  - Ensure CI artifacts are uploaded for coverage and Playwright failures
- Exit criteria:
  - `pnpm test:coverage` runs from repo root without script resolution errors
  - Coverage artifacts generated in CI for all participating packages

### Phase 1: Tiered Enforcement (Week 2)

- Goals:
  - Enforce fast-path PR required checks
  - Move full-suite jobs to main push only
  - Add aggregate status jobs for branch protection (`PR Required Checks`)
- Exit criteria:
  - PR checks complete faster than previous baseline median
  - Branch protection can require exactly one PR aggregate check

### Phase 2: Stability Controls (Week 3)

- Goals:
  - Introduce flaky test triage workflow
  - Enforce SLA on flaky failures and retry diagnostics
  - Require trace/video artifact review before test quarantine requests
- Exit criteria:
  - Weekly flaky rate trend exists
  - Quarantine list has owner and expiry for each item

### Phase 3: Quality Ratchet (Week 4+)

- Goals:
  - Incrementally raise coverage thresholds by package ownership
  - Keep exceptions time-bound
  - Enable targeted sharding only for bottleneck suites
- Exit criteria:
  - Coverage trend improves for 3 consecutive weeks
  - No net increase in CI red-rate due to threshold changes

## Pass/Fail Criteria

### PR Required Checks (blocking)

- Lint and Typecheck pass
- CI Gates + PR test suite pass

Fail PR if any of the above fail.

### Main Required Checks (blocking)

- Lint and Typecheck pass
- CI Gates + main test suite pass

Fail main pipeline if any of the above fail.

## Command Matrix

| Purpose                  | Local Command                                                                | CI Job             | Owner                     |
| ------------------------ | ---------------------------------------------------------------------------- | ------------------ | ------------------------- |
| Lint                     | `pnpm lint`                                                                  | `lint-typecheck`   | Platform Engineering      |
| Typecheck                | `pnpm typecheck`                                                             | `lint-typecheck`   | Platform Engineering      |
| CI gates + PR test suite | `pnpm test:suite:pr:required -- --base-ref=origin/main`                     | `gate-tests-pr`    | Platform + Package Owners |
| CI gates + main suite    | `pnpm test:suite:main:required`                                              | `gate-tests-main`  | Platform + Package Owners |
| Changed unit tests       | `pnpm test:suite:changed:unit -- --base-ref=origin/main`                    | `gate-tests-pr`    | Package Owners            |
| Changed e2e tests        | `pnpm test:suite:changed:e2e -- --base-ref=origin/main`                     | `gate-tests-pr`    | QA / Web Owners           |
| Full unit tests          | `pnpm test:suite:unit`                                                       | `gate-tests-main`  | Package Owners            |
| Coverage                 | `pnpm test:suite:coverage`                                                   | `gate-tests-main`  | Package Owners + Platform |
| Integration tests        | `pnpm test:suite:integration`                                                | `gate-tests-main`  | API Owners                |
| E2E tests                | `pnpm test:suite:e2e`                                                        | `gate-tests-main`  | QA / Web Owners           |
| Build                    | `pnpm test:suite:build`                                                      | `gate-tests-main`  | Platform Engineering      |

## Weekly Operating Cadence

- Monday:
  - Review prior week CI metrics
  - Identify top 3 instability sources
- Mid-week:
  - Fix flaky tests and update ownership tracker
- Friday:
  - Capture weekly summary in metrics template
  - Decide whether threshold ratchet can proceed next week

## Risks and Mitigations

- Risk: PR checks still slow despite changed-test strategy
  - Mitigation: narrow changed-test scope and prewarm dependency cache
- Risk: Coverage drops due to new modules
  - Mitigation: enforce package-level baseline and time-boxed exception list
- Risk: Flaky E2E noise
  - Mitigation: trace/video artifact triage and quarantine expiry policy

## Rollback Plan

- If PR lead-time regresses for 3 consecutive days:
  - Keep `PR Required Checks` unchanged
  - Temporarily move non-critical checks to advisory and track separately
- If false negatives increase:
  - Re-run failed jobs once with artifacts retained
  - Revert latest threshold ratchet commit if needed
