# Comm Contracts Standardization Implementation Log

## Objective

Stabilize and standardize `packages/contracts/src/comm` so command/query/search/CRUD contracts are consistent, scalable, and easier to evolve safely.

## Baseline Matrix (Phase 0)

| Module           | Entity | Commands | Queries | Events  | Gap Summary                                                             |
| ---------------- | ------ | -------- | ------- | ------- | ----------------------------------------------------------------------- |
| announcements    | yes    | yes      | partial | yes     | query/search shape not yet standardized to shared comm query primitives |
| approvals        | yes    | yes      | yes     | no      | events contract file missing; now has full query surface                |
| boardroom        | yes    | yes      | partial | partial | fragmented entities with mixed query patterns                           |
| chatter          | yes    | yes      | yes     | no      | list query still uses custom limit range                                |
| docs             | yes    | yes      | partial | yes     | search/list filter conventions not unified                              |
| projects         | yes    | yes      | partial | no      | missing events file and inconsistent query/search conventions           |
| tasks            | yes    | yes      | yes     | no      | rich coverage but mixed query primitive usage across submodules         |
| workflows        | yes    | yes      | yes     | yes     | mostly complete, now aligned to shared comm list/query primitives       |
| shared subdomain | yes    | yes      | yes     | no      | several list schemas still use local limit definitions                  |

## Implemented in This Slice

1. Added shared query primitives in `comm/shared/query.ts`:
   - `CommQueryTextSchema`
   - `CommListLimitSchema`
   - `CommSearchLimitSchema`
   - `CommDateRangeSchema`
   - shared defaults/max constants
2. Exported new shared primitives from `comm/shared/index.ts`.
3. Expanded `approvals/approval.commands.ts` with complete query contracts:
   - get/list/search approval requests
   - list approval steps
   - get/list approval policies
   - list approval delegations
4. Refactored `tasks/task.commands.ts` to use shared list/search/query primitives.
5. Refactored `workflows/workflow.commands.ts` to use shared list/query primitives.
6. Validation completed:
   - `pnpm --filter @afenda/contracts typecheck`
   - `pnpm --filter @afenda/contracts test`
7. Added shared-query-based query contracts in:
   - `announcements/announcement.commands.ts`
   - `projects/project.commands.ts`
   - `docs/document.commands.ts`
   - `boardroom/*.(meeting|agenda-item|attendee|resolution|minutes).commands.ts`
8. Added missing comm event-surface contracts:
   - `approvals/approval.events.ts`
   - `projects/project.events.ts`
   - `tasks/task.events.ts`
   - `chatter/chatter.events.ts`
   - and exported through each module `index.ts`
9. Added contract tests:
   - `comm/approvals/__vitest_test__/approval.commands.test.ts`
   - `comm/shared/__vitest_test__/query.test.ts`
10. Added comm response-envelope schema factories and tests:

- `comm/shared/response.ts`
- `comm/shared/__vitest_test__/response.test.ts`

11. Added outbox sync checks for normalized comm events:

- `comm/shared/__vitest_test__/outbox-event-sync.test.ts`
- validates `ApprovalEventTypes`, `ProjectEventTypes`, `TaskEventTypes`, `ChatterEventTypes`
- against `kernel/execution/outbox/OutboxEventSchema`

12. Started `module.queries.ts` split (without breaking module exports):

- `announcements/announcement.queries.ts` (query + list/search response schemas)
- `approvals/approval.queries.ts` (query + list/search response schemas)
- module barrels now export the new query modules

13. Extended `module.queries.ts` split across remaining comm modules:

- `docs/document.queries.ts`
- `projects/project.queries.ts`
- `workflows/workflow.queries.ts`
- `boardroom/*.queries.ts` (meeting, agenda-item, attendee, resolution, minutes)
- `tasks/*.queries.ts` (task, task-checklist-item, task-time-entry, task-watcher)
- `shared/*.queries.ts` (comment, inbox, label, saved-view, subscription)
- all corresponding module `index.ts` barrels now export query modules

14. Re-validated contracts package:

- `pnpm --filter @afenda/contracts typecheck`
- `pnpm --filter @afenda/contracts test` (5 files, 19 tests passing)

15. Added dedicated query-suite coverage for extracted modules:

- `comm/docs/__vitest_test__/document.queries.test.ts`
- `comm/projects/__vitest_test__/project.queries.test.ts`
- `comm/boardroom/__vitest_test__/boardroom.queries.test.ts`
- `comm/tasks/__vitest_test__/task.queries.test.ts`
- `comm/workflows/__vitest_test__/workflow.queries.test.ts`
- `comm/shared/__vitest_test__/module-queries.test.ts`

16. Re-validated contracts package after query-suite expansion:

- `pnpm --filter @afenda/contracts typecheck`
- `pnpm --filter @afenda/contracts test` (11 files, 37 tests passing)

17. Normalized repeated date-range refinements into shared helper:

- added `applyDateOrderRefinement` in `comm/shared/query.ts`
- adopted helper in date-range query schemas across:
  - `announcements/announcement.queries.ts`
  - `approvals/approval.queries.ts`
  - `docs/document.queries.ts`
  - `projects/project.queries.ts`
  - `boardroom/meeting.queries.ts`
  - `tasks/task.queries.ts`
  - `tasks/task-time-entry.queries.ts`
  - `workflows/workflow.queries.ts`

18. Added helper-level test coverage and re-validated:

- updated `comm/shared/__vitest_test__/query.test.ts`
- `pnpm --filter @afenda/contracts typecheck`
- `pnpm --filter @afenda/contracts test` (11 files, 38 tests passing)

19. Evaluated and standardized summary-query response envelopes where summary queries exist:

- added shared summary envelope factory + group schema in `comm/shared/response.ts`
- standardized summary response schemas in:
  - `tasks/task.queries.ts`
  - `tasks/task-time-entry.queries.ts`
  - `tasks/task-watcher.queries.ts`
  - `workflows/workflow.queries.ts`
- added/updated tests:
  - `comm/shared/__vitest_test__/response.test.ts`
  - `comm/tasks/__vitest_test__/task.queries.test.ts`
  - `comm/workflows/__vitest_test__/workflow.queries.test.ts`
  - `comm/shared/__vitest_test__/summary-response-adoption.test.ts`

20. Re-validated contracts package after summary-envelope standardization:

- `pnpm --filter @afenda/contracts typecheck`
- `pnpm --filter @afenda/contracts test` (12 files, 43 tests passing)

## Remaining Priority Backlog

- No open items in current comm contracts stabilization tracker.

## PR Slicing Strategy

1. PR 1: shared primitives + approvals completion + initial adopters (done).
2. PR 2: migrate all remaining query schemas to shared primitives.
3. PR 3: event coverage completion + registry alignment.
4. PR 4: tests and docs finalization.
