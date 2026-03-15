# CI Weekly Metrics Template

## Week Summary

- Week of:
- Prepared by:
- Release train / milestone:

## Pipeline Health

| Metric                            | Value | Target | Status |
| --------------------------------- | ----- | ------ | ------ |
| PR median duration (min)          |       |        |        |
| PR p95 duration (min)             |       |        |        |
| PR pass rate (%)                  |       |        |        |
| Main pass rate (%)                |       |        |        |
| Flaky failure rate (%)            |       |        |        |
| Mean time to red recovery (hours) |       |        |        |

## Check-Level Breakdown

| Check                       | Runs | Failures | Failure % | Top failure cause |
| --------------------------- | ---- | -------- | --------- | ----------------- |
| Lint & Typecheck            |      |          |           |                   |
| CI Gates                    |      |          |           |                   |
| PR Changed Unit Tests       |      |          |           |                   |
| PR Changed Playwright Tests |      |          |           |                   |
| Unit Tests                  |      |          |           |                   |
| Coverage                    |      |          |           |                   |
| Integration Tests           |      |          |           |                   |
| Playwright E2E              |      |          |           |                   |
| Build                       |      |          |           |                   |

## Coverage Trend

| Package/App        | Previous Week | Current Week | Delta | Owner |
| ------------------ | ------------- | ------------ | ----- | ----- |
| apps/api           |               |              |       |       |
| apps/web           |               |              |       |       |
| apps/worker        |               |              |       |       |
| packages/contracts |               |              |       |       |
| packages/core      |               |              |       |       |
| packages/db        |               |              |       |       |
| packages/ui        |               |              |       |       |

## Flaky Tests and Quarantine

| Test ID / File | Failures this week | Owner | Action | Expiry date |
| -------------- | ------------------ | ----- | ------ | ----------- |
|                |                    |       |        |             |

## Top 3 Issues and Actions

1. Issue:
   - Action:
   - Owner:
   - Due date:
2. Issue:
   - Action:
   - Owner:
   - Due date:
3. Issue:
   - Action:
   - Owner:
   - Due date:

## Week-over-Week Decision

- Can we ratchet coverage thresholds this week? (yes/no)
- Can we promote additional checks to required? (yes/no)
- Rollback needed? (yes/no)
- Notes:
