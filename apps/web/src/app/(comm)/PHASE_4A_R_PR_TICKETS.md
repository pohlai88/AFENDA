# Phase 4A-R PR Tickets

Last updated: March 13, 2026  
Purpose: implementation-ready tickets for remaining shared infra work

## Mandatory Execution Checklist (Apply To Every Ticket)

Preflight:

- Confirm capability boundary and out-of-scope list.
- Confirm import-direction compliance for touched layers.
- Run baseline: `pnpm typecheck && pnpm test && pnpm check:all`.

Build:

- Follow schema-is-truth sequence and keep route handlers thin.
- Ensure idempotency + audit + outbox on every mutation path.
- Propagate correlation id into worker flow.

Pre-merge:

- Run targeted tests for touched packages.
- Run full gates again.
- Verify registry sync: errors, permissions, audit actions, outbox unions, route registry, OWNERS.

## Ticket 1: Saved Views End-to-End (Tasks List)

Title:

- feat(comm-shared): implement saved views in core/api/web for tasks list

Scope:

- Add saved-view service/query support in core shared module.
- Add saved-view endpoints in comm shared API routes.
- Persist and restore tasks list filters/sort/columns from saved views.
- Support principal-scoped and org-shared views.
- Enforce one default view per principal/entity.

Primary files:

- packages/core/src/comm/shared/
- apps/api/src/routes/comm/shared.ts
- apps/web/src/app/(comm)/tasks/

Acceptance criteria:

- User can save, update, delete, and list views for task entity.
- Default view selection is deterministic and enforced.
- Saved view is restored when user returns to tasks list.
- API responses follow existing comm success/error envelope patterns.
- Typecheck and tests pass for touched modules.

Test checklist:

- Core: default uniqueness and ownership constraints.
- API: command/query contract and auth/org enforcement.
- Web: persisted view restoration and fallback behavior.

PR size guidance:

- Target 300-700 LOC net with focused scope.

Definition of done:

- Baseline + pre-merge checks are both green.
- No boundary gate regressions.

## Ticket 2: Subscriptions End-to-End (Watch/Unwatch)

Title:

- feat(comm-shared): add subscriptions core/api/worker and task-project watch controls

Scope:

- Implement subscribe/unsubscribe/list services in core shared module.
- Add watch/unwatch/list endpoints in comm shared API routes.
- Add watch/unwatch controls to task and project detail pages.
- Emit and process subscription events through worker dispatch path.

Primary files:

- packages/core/src/comm/shared/
- apps/api/src/routes/comm/shared.ts
- apps/worker/src/jobs/comm/shared/
- apps/web/src/app/(comm)/tasks/[id]/
- apps/web/src/app/(comm)/projects/[id]/

Acceptance criteria:

- User can watch and unwatch task and project entities.
- Duplicate subscribe is idempotent and does not create duplicates.
- Unsubscribe on non-existing watch is handled safely.
- Worker receives subscription events and routes to inbox dispatch path.

Test checklist:

- Core: idempotent subscribe/unsubscribe semantics.
- API: endpoint contract and tenant scoping.
- Web: action controls and optimistic/refresh behavior.

PR size guidance:

- Target 350-800 LOC net.

Definition of done:

- Baseline + pre-merge checks are both green.
- Event fan-out path verified with correlation id trace.

## Ticket 3: Mention Extraction and Inbox Dispatch Hardening

Title:

- feat(comm-shared): route comment mentions to inbox dispatch via worker

Scope:

- Parse mentions from comment payloads/events.
- Resolve recipients and publish inbox dispatch jobs/events.
- Preserve correlation id through full async chain.
- Add guardrails for malformed mention tokens and missing recipients.

Primary files:

- apps/worker/src/jobs/comm/shared/
- apps/worker/src/jobs/kernel/process-outbox-event.ts
- packages/core/src/comm/shared/comment.service.ts

Acceptance criteria:

- Mention in comment generates inbox dispatch for valid recipients.
- Invalid mentions do not break worker processing.
- Correlation id is logged and traceable through chain.
- No direct notification side effects in API route handlers.

Test checklist:

- Worker: mention parse and recipient resolution behavior.
- Integration-oriented path checks: command -> outbox -> worker -> inbox dispatch.

PR size guidance:

- Target 250-600 LOC net.

Definition of done:

- Baseline + pre-merge checks are both green.
- Mention parser failure cases handled without worker crash.

## Ticket 4: Hardening and Quality Gate Closure

Title:

- chore(comm-shared): hardening pass for saved views/subscriptions/mentions

Scope:

- Improve empty/error states in tasks and project detail pages.
- Validate permission checks for all new mutations.
- Ensure route registry and domain registry alignment.
- Final pass on edge cases and observability logs.

Primary files:

- apps/web/src/app/(comm)/tasks/
- apps/web/src/app/(comm)/projects/
- apps/api/src/routes/comm/shared.ts
- packages/core/src/comm/shared/

Acceptance criteria:

- No known regressions in comments/labels flows.
- New shared capabilities pass full gate run.
- Operational logs include correlation-friendly diagnostics.

Final verification commands:

- pnpm typecheck
- pnpm test
- pnpm check:all

Definition of done:

- All Phase 4A-R tickets validated with green gate run.
- No unresolved TODOs that block operational behavior.
