# Phase 4A-R Shared Infra Remaining Execution Plan

Last updated: March 13, 2026  
Scope: remaining shared infra work in comm (saved views, subscriptions, mention-to-inbox flow)

## Current Status Snapshot

Completed in Phase 4A:

- Comments are live end-to-end (core, API, worker, web task/project detail).
- Labels are live end-to-end (core, API, worker, web task/project detail).

Remaining for Phase 4A closeout:

- Saved views (core + API + web tasks list persistence).
- Subscriptions (core + API + worker + web watch/unwatch).
- Mention extraction handoff to inbox dispatch path.

## Objective

Close the shared infra gap with minimum drift and maximum reuse of already-proven comm patterns.

Definition of success:

- Saved views persist and restore list filters/sort/columns in comm tasks list.
- Users can watch and unwatch task and project entities.
- Subscription and mention events route to inbox dispatch through worker path.
- No new response envelope shape, no direct web-to-db coupling, no missing audit/outbox on mutations.

## Execution Strategy

1. Finish capability slices, not layer batches.

- Slice 1: saved views, end-to-end.
- Slice 2: subscriptions, end-to-end.
- Slice 3: mention dispatch hardening into inbox path.

2. Reuse existing shared route/service conventions.

- Keep route handlers thin and call core only.
- Reuse success/error schema patterns already used in comm shared routes.

3. Keep PRs narrow and reversible.

- One capability per PR.
- Favor clear migration points over broad refactors.

## Remaining Work Breakdown

### Slice 1: Saved Views

Core:

- Implement saved-view service and query surface in packages/core/src/comm/shared/.
- Enforce one default view per principal/entity pair.
- Support principal-scoped and org-shared view semantics.

API:

- Add endpoints in apps/api/src/routes/comm/shared.ts for save/list/update/delete saved views.
- Reuse makeSuccessSchema and ApiErrorResponseSchema response conventions.

Web:

- Wire tasks list UI in apps/web/src/app/(comm)/tasks/ to persist and restore filters/sort/columns.
- Add default view apply behavior on first load.

Tests:

- Core tests for default uniqueness and ownership constraints.
- API tests for list and mutation contract behavior.

### Slice 2: Subscriptions

Core:

- Implement subscribe/unsubscribe/list operations in packages/core/src/comm/shared/.
- Enforce idempotent subscribe semantics.

API:

- Add watch/unwatch/list subscription endpoints in apps/api/src/routes/comm/shared.ts.

Worker:

- Route subscription change events into inbox dispatch path.
- Keep side effects only in worker, not API/core.

Web:

- Add watch/unwatch controls in task and project detail pages.

Tests:

- Core and API tests for duplicate subscribe/unsubscribe safety.

### Slice 3: Mentions to Inbox Path

Core/API:

- Ensure comment create/update flows emit the data needed for mention extraction.

Worker:

- Parse mention tokens from comment payload, resolve recipients, and emit inbox dispatch jobs/events.
- Include correlationId propagation for traceability.

Validation:

- Verify event chain: command -> outbox -> worker -> inbox dispatch.

## Anti-Drift Rules

1. Do not introduce a new response envelope style.

- Reuse existing comm API envelope conventions.

2. Do not bypass core from API handlers.

- API handles auth/validation/response mapping; business logic remains in core.

3. Do not skip audit/outbox on mutations.

- Every command path includes idempotency key, audit action, and outbox event.

4. Do not merge without registry checks.

- Keep error, permission, audit action, and outbox event unions aligned.

## Validation Workflow

1. Validate typing first.

- pnpm typecheck

2. Run targeted tests.

- pnpm --filter @afenda/core test
- pnpm --filter @afenda/api test
- pnpm --filter @afenda/web test

3. Run full gates before merge.

- pnpm check:all

4. Trace by correlation id if failures occur in async paths.

## Updated PR Sequence (Remaining)

1. PR-4A-R1: Saved views core + api + tasks list web.
2. PR-4A-R2: Subscriptions core + api + worker + task/project web controls.
3. PR-4A-R3: Mention extraction and inbox dispatch hardening.
4. PR-4A-R4: Hardening and edge-case pass.

## Done Criteria For Phase 4A-R

- Saved views are usable and persistent in comm tasks list.
- Watch/unwatch works for task and project entities.
- Mention and subscription flows generate inbox dispatch through worker path.
- Typecheck, tests, and check:all are green.
