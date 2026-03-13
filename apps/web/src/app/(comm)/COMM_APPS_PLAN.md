# AFENDA Communication Module — Enterprise Architecture Plan

> **Pillar:** `comm` | **Benchmark:** Notion · Asana · Linear · Jira · ServiceNow · Diligent  
> **Last Updated:** March 15, 2026 | **Status:** Tasks ✅ · Projects ✅ · Approvals ✅ · Shared Infra ✅ · Inbox ✅ · Chatter ✅ · **Announcements ✅** · **Docs ✅ (RBAC + collaborator complete)** · **Boardroom ✅ COMPLETE** · **Workflows ✅ COMPLETE**

---

### Quick status

| Phase | Module    | Status          | Next action                                                                                       |
| ----- | --------- | --------------- | ------------------------------------------------------------------------------------------------- |
| 6A    | Docs      | **COMPLETE** ✅ | Run `pnpm db:migrate` when `DATABASE_URL` set; includes RBAC + collaborator (migration 0010)      |
| 6B    | Boardroom | **COMPLETE** ✅ | All features implemented (meetings, agenda, attendees, resolutions, votes, minutes, action items) |
| 7     | Workflows | **COMPLETE** ✅ | All layers delivered; uses `comm.workflow.*` permission keys                                      |

---

## 1. Vision

The `comm` pillar is AFENDA's **collaboration and work orchestration backbone**. Where `erp` handles transactional finance (AP, GL, Treasury) and `kernel` handles governance (audit, identity, policy), `comm` manages the human coordination layer — tasks, projects, approvals, meetings, and knowledge.

Every `comm` module is:

- **Multi-tenant by default** — all data scoped by `org_id`, all queries via `withOrgContext`
- **Audit-first** — every mutation produces an immutable audit trail
- **Event-driven** — outbox events trigger side effects (notifications, escalations, webhooks)
- **Permission-gated** — RBAC at field and action level
- **Idempotent** — every command accepts `idempotencyKey`

### Current Delivery Snapshot

| Module            | Contracts                                                          | DB                                                                      | Core                                                                       | API                                                                                        | Worker                                                                  | Web UI                                                                                 | Status                   |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------ |
| **tasks**         | ✅                                                                 | ✅                                                                      | ✅                                                                         | ✅                                                                                         | ✅ (12 handlers)                                                        | ✅ list/my/board/detail/new                                                            | **Complete**             |
| **projects**      | ✅                                                                 | ✅                                                                      | ✅                                                                         | ✅                                                                                         | ✅ (7 handlers)                                                         | ✅ list/detail/board/timeline/settings                                                 | **Complete**             |
| **approvals**     | ✅                                                                 | ✅                                                                      | ✅                                                                         | ✅                                                                                         | ✅ (8 handlers)                                                         | ✅ queue/pending/detail/policies                                                       | **Complete**             |
| **shared infra**  | ✅ comments/labels/views/subscriptions/mentions                    | ✅                                                                      | ✅ comments+labels+saved-view+subscription+mention extraction              | ✅ comments+labels+saved-view+subscription                                                 | ✅ comment/label/view/subscription/mention events                       | ✅ task/project comments+labels+watch controls                                         | **Complete**             |
| **inbox**         | ✅ inbox items + notification prefs                                | ✅                                                                      | ✅ markRead/markAllRead/upsertPref + queries                               | ✅ list/unread-count/mark-read/prefs                                                       | ✅ inbox-fanout/item-read/all-read/pref-updated                         | ✅ /comm/inbox, /unread, /preferences                                                  | **Complete**             |
| **chatter**       | ✅ message + post command schemas                                  | ✅                                                                      | ✅ postChatterMessage + listChatterMessages (reuses comment)               | ✅ GET /chatter/messages + POST chatter/post                                               | ✅ via mention fan-out → inbox items                                    | ✅ EntityChatterClient on task+project detail                                          | **Complete**             |
| **announcements** | ✅ entity/commands/events                                          | ✅                                                                      | ✅ service + queries + audience options                                    | ✅ list/detail/reads + command routes                                                      | ✅ publish/schedule/ack/archive (+ tests)                               | ✅ feed/create/detail + audience picker                                                | **Complete**             |
| **docs**          | ✅ entity+commands+events+collaborator schemas                     | ✅ schema + `comm_document_collaborator` (migration 0010)               | ✅ service+queries+hierarchy+addCollaborator/removeCollaborator            | ✅ list/detail/children/breadcrumb/by-slug/collaborators + RBAC (comm.document.\*)         | ✅ create/update/publish/archive handlers                               | ✅ list/new/detail/history+type/visibility/slug                                        | **COMPLETE** ✅          |
| **boardroom**     | ✅ meeting+agenda+attendee+resolution+minutes+action-item (entity) | ✅ schema (meeting, agenda, attendee, resolution, minutes, action_item) | ✅ meeting+agenda+attendee+resolution+minutes+action-item services+queries | ✅ list/detail/create/update + agenda/attendees/resolutions+votes + minutes + action-items | ✅ meeting/agenda-item/attendee/resolution/minutes/action-item handlers | ✅ list/new/detail + agenda + attendees + resolutions+vote + minutes + action-items UI | **Phase 6B COMPLETE** ✅ |
| **workflows**     | ✅ workflow+run entity/commands/events                             | ✅ `comm_workflow` + `comm_workflow_run` tables                         | ✅ CRUD + execute service + run queries                                    | ✅ list/detail/runs + command routes (comm.workflow.\* RBAC)                               | ✅ execute/complete/fail run handlers                                   | ✅ list/new/detail/runs pages + capability resolver                                    | **Phase 7 COMPLETE** ✅  |

**Verified complete (March 13, 2026):**

- `tasks`: all 12 worker handlers, full web UI with DnD kanban board, checklist, time tracking, bulk ops
- `projects`: settings page (members, milestones, status transitions, update/archive) fully implemented — no remaining backlog
- `approvals`: contracts + DB + core service/query + API routes + worker handlers + web queue/detail/pending/policies are implemented
- `shared`: comments (with @mention extraction), labels, saved views, and subscriptions are active end-to-end across core + API + worker + web (task detail watch/unwatch + list).
- `inbox`: contracts (CommInboxItem + CommNotificationPreference schemas) + DB tables + core service (markInboxItemRead, markAllInboxRead, upsertNotificationPreference) + API routes + worker fan-out (inbox-fanout.ts) + web pages (/comm/inbox, /comm/inbox/unread, /comm/inbox/preferences) with InboxClient and PreferencesClient components.
- `chatter`: contracts (CommChatterMessage schemas) + core service (postChatterMessage via shared addComment + listChatterMessages) + API routes (GET /chatter/messages, POST /commands/chatter/post-message) + reusable EntityChatterClient component wired into task detail and project detail side panels; mention fan-out produces inbox items for @mentions.
- `announcements`: Phase 5B hardening is complete. Inbox deep-link routing, acknowledgement UX state, core regression coverage, and full validation (`typecheck`, `test`, `check:all`) are closed.

**Stabilization run (March 13, 2026):**

- Docs thin slice: fixed audit action registry (document.created/updated/published/archived), `listCommDocuments` export conflict with kernel `listDocuments`, `withAudit` generic typing, announcements detail page Skeleton import and `announcementId` null handling. All gates pass (`pnpm typecheck && pnpm test && pnpm check:all`).

**Phase 6A complete (March 13, 2026):**

- `docs`: full vertical slice across contracts, DB schema, core services/queries, API routes, worker handlers, web pages. Includes documentType, visibility, slug, parentDocId, hierarchy (breadcrumb, children, by-slug), shared infra (comments, labels, subscriptions), publish/archive guards, and focused tests. Collaborator/presence table deferred.

**Phase 6B COMPLETE (March 14, 2026):**

- `boardroom`: **FULLY IMPLEMENTED end-to-end** including:
  - ✅ Meeting CRUD (create, list, detail, update)
  - ✅ Agenda items (add, list, display on meeting detail)
  - ✅ Attendees (add, update status, list, display on meeting detail)
  - ✅ Resolutions (propose, list, display on meeting detail)
  - ✅ Votes (cast vote For/Against/Abstain, list votes per resolution)
  - ✅ **Minutes** (record minutes, list by meeting, detail page)
  - ✅ **Action items** (create from minutes, update status/assignee/due date, list by minute)
  - ✅ **DB schema**: `comm_board_meeting`, `comm_board_agenda_item`, `comm_board_meeting_attendee`, `comm_board_resolution`, `comm_board_resolution_vote`, **`comm_board_minutes`**, **`comm_board_action_item`**
  - ✅ **Migration**: `0008_comm_board_minutes_action_item.sql` generated and ready
  - ✅ **Web UI**: Meeting list/new/detail with agenda card, attendees card, resolutions card, **minutes section**, **action items pages**
  - ✅ **Events**: COMM_MEETING_CREATED, COMM_AGENDA_ITEM_ADDED, COMM_ATTENDEE_ADDED, COMM_ATTENDEE_STATUS_UPDATED, COMM_RESOLUTION_PROPOSED, COMM_VOTE_CAST, **COMM_MINUTES_RECORDED**, **COMM_ACTION_ITEM_CREATED**, **COMM_ACTION_ITEM_UPDATED**
  - ✅ **Worker handlers**: handle-meeting-created, handle-agenda-item-added, handle-attendee-added, handle-resolution-proposed, **handle-minutes-recorded**, **handle-action-item-created**, **handle-action-item-updated**

**Next development focus (as of March 14, 2026):**

1. **Phase 6A — Docs module (complete)** ✅

   - [x] Thin-slice contracts are present.
   - [x] Thin-slice DB schema is present.
   - [x] Thin-slice core/API mutation and query flows are present.
   - [x] Thin-slice worker publish fan-out is present.
   - [x] Thin-slice web pages exist for list/create/detail/history.
   - [x] Full validation passes after route namespace and gate reconciliation.
   - [x] Align contracts to target spec: add `documentType`, `visibility`, `slug`, `parentDocId`, `lastEditedByPrincipalId`.
   - [x] Add DB completion work: document_type, visibility, slug, parent_doc_id, last_edited_by_principal_id columns + migration 0003.
   - [ ] Add collaborator/presence table (deferred to later phase).
   - [x] Expand core/API flows: update semantics, publish/archive guards, slug/path handling, hierarchy queries (getDocumentBySlug, listChildDocuments, getDocumentBreadcrumb), and slug uniqueness guards.
   - [x] Integrate shared infrastructure: comments (EntityChatterClient), labels (EntityLabelsClient), subscriptions (watch/unwatch), and chatter context for docs.
   - [x] Add docs-focused tests in core/API/worker/web: document.service.test.ts, document.queries.test.ts, handle-document-published.test.ts, inbox links for document, docs-links.test.ts.
   - **Exit criteria met:** docs CRUD + version history + publish notifications work end-to-end; data model matches target knowledge-base spec; all 22 gates pass. ✅
   - **Deferred:** collaborator/presence table. **Action:** run `pnpm db:migrate` once `DATABASE_URL` is set.

2. **Phase 6B — Boardroom module (COMPLETE)** ✅

   - [x] Contracts + DB for meetings (entity, commands, events, `comm_board_meeting` table).
   - [x] Core/API command/query flows for meeting create/update/list/detail.
   - [x] Worker handlers for meeting-created, meeting-updated; inbox fan-out to chair + secretary.
   - [x] Agenda items: contracts, DB `comm_board_agenda_item`, core/API/worker, web (list + add item).
   - [x] Attendees: contracts, DB `comm_board_meeting_attendee`, core/API/worker, web (list + add attendee + status).
   - [x] Resolutions + votes: contracts, DB `comm_board_resolution` + `comm_board_resolution_vote`, core/API/worker, web (list + propose + cast vote).
   - [x] Web pages for agenda, attendees, resolutions (cards on meeting detail + add/propose/vote flows).
   - [x] **Minutes + action items**: ✅ FULLY IMPLEMENTED
     - [x] Contracts: `minutes.entity.ts`, `minutes.commands.ts`, `minutes.queries.ts`, events (COMM_MINUTES_RECORDED, COMM_ACTION_ITEM_CREATED, COMM_ACTION_ITEM_UPDATED)
     - [x] DB schema: `comm_board_minutes`, `comm_board_action_item` tables with RLS, indexes, foreign keys
     - [x] Migration: `0008_comm_board_minutes_action_item.sql` generated
     - [x] Core services: recordMinutes, listMinutesByMeeting, createActionItem, updateActionItem, listActionItemsByMinute
     - [x] API routes: GET /minutes, POST /commands/minutes/record, GET /action-items, POST /commands/action-items/create, PATCH /update
     - [x] Worker handlers: handle-minutes-recorded.ts, handle-action-item-created.ts, handle-action-item-updated.ts
     - [x] Web UI: Minutes section on meeting detail, record minutes page, minutes detail page with action items list, create/update action item pages
     - [x] API client: fetchBoardMeetingMinutes, recordBoardMinutes, fetchActionItemsByMinute, createBoardActionItem, updateBoardActionItem
   - **Exit criteria:** ✅ ALL COMPLETE. Meeting + agenda + attendees + resolutions + votes + minutes + action items end-to-end; all 22 gates pass. **PHASE COMPLETE**.

3. **Phase 7 — Workflows automation engine** (NEXT PRIORITY)

   - [ ] Rule model + trigger/action schemas and validation.
   - [ ] Execution service with idempotent runs and audit event trails.
   - [ ] Worker trigger integration from tasks/approvals/boardroom/docs events.
   - [ ] Rule management UI and execution visibility.
   - Exit criteria: safe trigger-condition-action automations run across comm modules.

### Next Development and Implementation Sequence

The next execution sequence should prioritize highest leverage and lowest architecture risk from the **current** repo state:

1. **Docs Phase 6A — Complete** ✅

   - Schema, core/API, shared infra, UI, and tests are implemented. Run `pnpm db:migrate` once `DATABASE_URL` is set.

2. **Boardroom Phase 6B — COMPLETE** ✅

   - **ALL FEATURES DELIVERED**: meetings, agenda, attendees, resolutions, votes, minutes, and action items are fully implemented end-to-end
   - Meeting CRUD + agenda items + attendees + resolutions + votes + **minutes + action items** implemented end-to-end
   - Inbox fan-out on meeting created (chair + secretary); worker handlers for agenda-item-added, attendee-added, resolution-proposed, **minutes-recorded, action-item-created, action-item-updated**
   - Shell/nav: Boardroom, Announcements, Docs, Inbox in COMM and BoardRoom sections
   - **Status:** ✅ PHASE COMPLETE — no remaining work

3. **Workflows Phase 7 — Post-domain automation** (NEXT PRIORITY)

   - Meeting CRUD + agenda items + attendees + resolutions + votes implemented end-to-end.
   - Inbox fan-out on meeting created (chair + secretary); worker handlers for agenda-item-added, attendee-added, resolution-proposed.
   - Shell/nav: Boardroom, Announcements, Docs, Inbox in COMM and BoardRoom sections.
   - **Remaining:** minutes + action items (contracts and reference SQL/OpenAPI in repo; implement DB, core, API, worker, web).

4. **Workflows Phase 7 — Post-domain automation**

   - Build workflows only after docs and boardroom primitives are stable.
   - Reuse existing outbox and worker fan-out patterns instead of introducing a separate orchestration path.
   - Exit criteria: trigger-condition-action automation executes safely with audit, idempotency, and org isolation.

### Remaining Work (as of March 14, 2026)

| Area          | Item                                                         | Status          | Priority      |
| ------------- | ------------------------------------------------------------ | --------------- | ------------- |
| **Docs**      | Run `pnpm db:migrate` once `DATABASE_URL` is set             | —               | Before deploy |
| **Docs**      | Collaborator/presence table (`comm_document_collaborator`)   | ✅ Done         | —             |
| **Docs**      | `comm.document.*` permissions (document-level RBAC)          | ✅ Done         | —             |
| **Boardroom** | Agenda items (entity, commands, DB, API, web)                | Done            | —             |
| **Boardroom** | Attendees (entity, commands, DB, API, web)                   | ✅ Done         | —             |
| **Boardroom** | Resolutions + votes (entity, commands, DB, API, web)         | ✅ Done         | —             |
| **Boardroom** | Minutes + action items (DB, core, API, worker, web)          | ✅ **COMPLETE** | —             |
| **Boardroom** | Inbox fan-out on meeting created (worker handler)            | ✅ Done         | —             |
| **Boardroom** | Add boardroom to shell/nav                                   | ✅ Done         | —             |
| **Workflows** | Phase 7 — all layers (contracts, DB, core, API, worker, web) | ✅ **COMPLETE** | —             |

---

### Remaining to close (checklist)

To close the COMM plan, complete the following in order:

| #     | Item                                      | Scope                            | Artifacts / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | ----------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~1~~ | ~~**Boardroom: Minutes + action items**~~ | ~~DB, core, API, worker, web~~   | ✅ **COMPLETE** — All layers implemented: contracts (`minutes.entity.ts`, `minutes.commands.ts`), DB schema (`comm_board_minutes`, `comm_board_action_item`), migration (`0008_comm_board_minutes_action_item.sql`), core services (recordMinutes, createActionItem, updateActionItem, list queries), API routes (GET/POST endpoints), worker handlers (handle-minutes-recorded, handle-action-item-\*), web UI (minutes section + detail pages, action items CRUD). |
| 2     | **Docs: Document-level RBAC**             | Contracts, API                   | Add `comm.document.read`, `comm.document.write`, `comm.document.manage` to `permissions.ts`; enforce in document API (document-level check then org fallback).                                                                                                                                                                                                                                                                                                       |
| 3     | **Docs: Collaborator table**              | DB, core, API                    | Table `comm_document_collaborator` (see reference SQL in `docs/comm/boardroom-minutes-action-items-migration.sql`); add/remove collaborator API; optional list-by-document.                                                                                                                                                                                                                                                                                          |
| 4     | **Workflows Phase 7**                     | Contracts, DB, core, API, worker | Trigger/action model; `workflows` table; lightweight worker executor; basic admin UI. After #1–3 stable.                                                                                                                                                                                                                                                                                                                                                             |
| 5     | **Operational**                           | —                                | Run `pnpm db:migrate` when `DATABASE_URL` set; feature flags `feature_comm_minutes`, `feature_comm_action_items`, `feature_comm_doc_collaborators`; monitoring counters.                                                                                                                                                                                                                                                                                             |

### Defer vs implement — implementation strategy (no passive deferrals)

Nothing is deferred by default. Every previously deferred item has a clear **implementation strategy**; deferral only when blocked by external dependency (e.g. third-party service, product decision). Principles: **thin-slice first**, **contracts-first**, **feature flags / opt-in**, and **acceptance criteria** per slice.

---

#### Decision table — items, priority, effort, immediate action

| Item                                      |    Priority     | Estimated effort | Immediate action                             | Reasoning (codebase evidence)                                                                                                                                |
| ----------------------------------------- | :-------------: | :--------------: | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ~~**Boardroom: minutes + action items**~~ |    ~~High~~     |    ~~Medium~~    | ✅ **COMPLETE**                              | ✅ All tables exist (`comm_board_minutes`, `comm_board_action_item`); migration 0008 generated; full implementation across contracts/DB/core/API/worker/web. |
| **Workflows Phase 7 (engine + triggers)** | **HIGH (NEXT)** |      Large       | **Implement next**                           | No `workflows` in `packages/contracts/src/comm/`; requires trigger/action semantics and integration points. Unblocked now that boardroom is complete.        |
| **Docs: Collaborator / presence**         |     Medium      |  Small → Medium  | **Implement minimal collaborator model**     | No `document_collaborator` in `packages/db/src/schema/comm/docs.ts`; add thin-slice co-edit metadata first.                                                  |
| **Docs: `comm.document.*` permissions**   |     Medium      |      Small       | **Implement document-level RBAC thin slice** | No `comm.document.*` in `permissions.ts`; implement minimal RBAC hooks and expand later.                                                                     |
| **DB migration (`pnpm db:migrate`)**      |   Operational   |    Very small    | **Run before deploy**                        | No code change; required when `DATABASE_URL` present.                                                                                                        |

---

#### Implementation strategy (principles)

- **No passive deferrals:** For each item, define a minimal, testable implementation path. Defer only if blocked by external dependency.
- **Thin-slice first:** Smallest useful vertical slice that delivers value and enables iteration.
- **Contracts-first:** Add contracts (types/DTOs) and DB schema together so API, worker, and web can proceed in parallel.
- **Feature flags / opt-in:** Ship behind flags to limit blast radius.
- **Acceptance criteria:** Per item: clear acceptance tests and migration steps.

---

#### ~~Boardroom minutes + action items — concrete design~~ ✅ COMPLETE

**Status:** ✅ **FULLY IMPLEMENTED** (March 14, 2026)

All design criteria have been successfully implemented:

- ✅ **DB schema**: `comm_board_minutes` and `comm_board_action_item` tables created with proper RLS, indexes (`meeting_id`, `org_id`, `minute_id`, `assignee_id`, `due_date`), foreign keys, and org scoping
- ✅ **Migration**: `0008_comm_board_minutes_action_item.sql` generated with idempotent DDL
- ✅ **Contracts**: `BoardMinuteSchema`, `BoardActionItemSchema`, `ActionItemStatusValues` in `minutes.entity.ts`; commands in `minutes.commands.ts`
- ✅ **Events**: `COMM_MINUTES_RECORDED`, `COMM_ACTION_ITEM_CREATED`, `COMM_ACTION_ITEM_UPDATED` registered
- ✅ **Core services**: `recordMinutes`, `listMinutesByMeeting`, `createActionItem`, `updateActionItem`, `listActionItemsByMinute`
- ✅ **API endpoints**: All routes implemented under `/v1/comm-board-meetings/...`
- ✅ **Worker handlers**: `handle-minutes-recorded.ts`, `handle-action-item-created.ts`, `handle-action-item-updated.ts`
- ✅ **Web UI**: Minutes section on meeting detail page, record minutes form, minutes detail page with action items list, create/update action item forms
- ✅ **API client**: `fetchBoardMeetingMinutes`, `recordBoardMinutes`, `fetchActionItemsByMinute`, `createBoardActionItem`, `updateBoardActionItem`

No further work required on this slice.

---

#### Workflows Phase 7 — pragmatic implementation path

**Goal:** Minimal workflow runner and trigger model for the most common use-cases without a full engine.

**Thin-slice scope:**

- **Trigger types:** e.g. `on_resolution_passed`, `on_action_item_due`, `on_document_updated`.
- **Action types:** e.g. `create_action_item`, `send_notification`, `call_webhook`.
- **Storage:** `workflows` table with JSON `definition` and `enabled` flag; org-scoped.
- **Executor:** Lightweight worker that evaluates triggers (on outbox events) and runs actions.

**Why thin-slice:** Avoids full DSL; start with JSON definitions and a small set of triggers/actions. Integrates with Boardroom minutes and action items.

**Acceptance criteria:**

- Define a workflow that reacts to a resolution and creates an action item.
- Admin UI to enable/disable workflows (basic).
- Audit log for workflow runs.

---

#### Docs: collaborator and document-level permissions — minimal plan

**Goal:** Minimal collaborator model and document-level RBAC for co-edit metadata and per-document access.

**DB (one-table collaborator):**

- `document_collaborators` (or `comm_document_collaborator`): `document_id`, `user_id` (principal_id), `role` (e.g. `editor`), `added_at`, `org_id`; PK `(document_id, user_id)`; RLS by org.

**Permissions:**

- Add `comm.document.read`, `comm.document.write`, `comm.document.manage` to `permissions.ts`.
- In document API: if document-level permission exists, check it (e.g. collaborator or owner), else fallback to org-level.

**Thin-slice:** Metadata-only presence (who is collaborator) and read/write checks. Real-time presence/co-editing (cursor sync) deferred until product requires it.

**Acceptance criteria:**

- Add/remove collaborator API works; document read/write endpoints enforce document-level permissions; migration and tests.

---

#### Operational checklist (pre-deploy and infra)

- **Run migrations:** `pnpm db:migrate` when `DATABASE_URL` set.
- **Feature flags:** Consider flags for minutes, action items, workflows, doc-collaborators.
- **CI:** Migration step in CI; rollback test where feasible.
- **Env:** `DATABASE_URL`, worker queue config, notification provider credentials as needed.
- **Monitoring:** Basic metrics for workflow runs and action-item reminders.

---

#### Checkpoints and re-evaluation

- **Ship Boardroom minutes + action items to staging** → pilot → then enable Workflows Phase 7 development.
- **After one production release of minutes:** evaluate real-time co-editing need (metrics: collaborative docs, user requests).
- **Workflows:** Re-evaluate after successful workflow-triggered action-item runs in production.

---

#### One-line prioritized order (executable)

1. **Implement Boardroom minutes + action items** (contracts, DB, core, API, worker hooks).
2. **Add document-level RBAC and document_collaborators** (thin slice).
3. **Implement minimal Workflows Phase 7** (triggers/actions) integrated with Boardroom.
4. **Run DB migrations and operational checks; enable feature flags; monitor.**

### Implementation Guardrails for Next Slices

- **Registry completeness:** Every error code returned by services must be in `ErrorCodeValues` ([packages/contracts/src/shared/errors.ts](packages/contracts/src/shared/errors.ts)). The domain-completeness gate enforces comm (error/audit/permission prefixes).
- **Docs access:** Docs are currently org-scoped; explicit `comm.document.*` permissions are not yet enforced. Add and wire permissions when document-level RBAC is required.
- Keep strict schema-is-truth order: contracts → db → migration → core → api → worker → web → tests.
- Reuse existing event/outbox patterns from tasks/projects/approvals; avoid introducing a parallel notification path.
- Maintain multi-tenant and audit invariants on every new mutation (idempotency key + audit + outbox).
- Prefer thin route handlers and place all business logic in core services.

### Strategic Delivery Model (Speed Without Drift)

To reduce debugging loops and architecture drift while shipping fast, run each slice with this delivery model:

1. **Vertical thin-slice first, breadth second**

   - Ship one end-to-end happy path per feature before adding permutations.
   - Example for shared infra: create comment on task detail (contracts → db already present → core → api → web) before labels/saved views/subscriptions.

2. **Contract-first acceptance tests before UI expansion**

   - Write core + API tests for command/query invariants first.
   - Treat web pages as consumers of already-stable endpoints.

3. **Reuse proven patterns from completed modules**

   - Copy the route/service/worker skeleton and response shaping patterns from tasks/projects/approvals instead of inventing new patterns.

4. **Drift gates in every PR**

   - Require architecture boundary check, route registry sync, domain completeness updates, and ownership updates for each module touch.
   - Block merges on failing `pnpm typecheck`, `pnpm test`, or `pnpm check:all`.

5. **Small PR cadence**

   - Keep scope to one bounded capability per PR (for example: comments read/write only).
   - This keeps review focused, improves rollback safety, and minimizes bug blast radius.

6. **Operational observability by default**
   - Every new command path must emit correlation-friendly audit and outbox records, so debugging follows event trails instead of guesswork.

### Experience Learnings Applied (March 13 Retrospective)

1. **Status drift is expensive**

   - Before updating roadmap docs, verify each layer (contracts/db/core/api/worker/web) from code, not assumptions.
   - Track status as capability slices (`comments+labels`, `saved views`, `subscriptions`) instead of broad "shared infra" labels.

2. **Vertical slices reduce debug loops**

   - The comments-first then labels rollout validated service, route, worker, and web integration patterns early.
   - Keep next slices similarly narrow: saved views first, then subscriptions.

3. **Reuse beats redesign**

   - Existing tasks/projects/approvals response and worker patterns avoided interface churn and reduced defect risk.
   - Continue using established route schemas, error envelopes, and outbox processing paths.

4. **Gate discipline prevents late surprises**

   - Maintaining `typecheck`, `test`, and `check:all` at PR boundaries keeps architecture boundaries intact.
   - For remaining shared scope, include route-registry and domain registry updates in every PR checklist.

### Execution Playbook Reference

- Detailed implementation checklist: `apps/web/src/app/(comm)/PHASE_4A_SHARED_INFRA_EXECUTION.md`

---

## 2. Module Taxonomy

| Module            | Benchmark Reference                                  | Purpose                                                                                  |
| ----------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **tasks**         | Asana tasks, Linear issues, Notion databases         | Work items with lifecycle, ownership, subtasks, checklists, SLA                          |
| **projects**      | Asana projects, Monday boards, Notion databases      | Project containers with milestones, phases, and progress tracking                        |
| **boards**        | Trello, Linear kanban, Notion board view             | Visual board views (kanban, timeline, calendar) across any work items                    |
| **approvals**     | ServiceNow approvals, SAP workflow, Oracle approvals | Multi-step approval chains with delegation, escalation, SLA breach                       |
| **boardroom**     | Diligent Boards, BoardEffect, Azeus Convene          | Board meetings, agenda, resolutions, voting, minutes, action items                       |
| **inbox**         | Notion inbox, Gmail priority inbox                   | Unified notification center across all comm + erp events                                 |
| **announcements** | Slack channels, Teams announcements                  | Org-wide broadcasts, policy distributions, read confirmations                            |
| **docs**          | Notion pages, Confluence, Google Docs                | Rich-text documents, wikis, SOPs, knowledge base                                         |
| **chatter**       | Slack threads, Teams channel messages                | Contextual threaded discussions attached to any entity record                            |
| **workflows**     | Zapier, Power Automate, n8n                          | Automation rules: triggers → conditions → actions (escalation, assignment, notification) |

### Shared Infrastructure (Cross-Module)

These capabilities are shared across all `comm` modules, not duplicated:

| Shared Capability | Description                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **comments**      | Threaded comments attachable to any entity (`comm_comment` table with `entity_type` + `entity_id`) |
| **attachments**   | File attachments on any entity (references `kernel` evidence/document store)                       |
| **activity feed** | Append-only activity stream per entity (audit log projection)                                      |
| **mentions**      | `@user` and `@team` mentions in rich text, triggering inbox notifications                          |
| **labels/tags**   | User-defined labels per org, applicable to tasks, projects, docs                                   |
| **saved views**   | Persisted filter + sort + column configurations per user per entity type                           |
| **search**        | Full-text search across tasks, projects, docs, comments                                            |
| **subscriptions** | Watch/unwatch any entity for change notifications                                                  |

---

## 3. Module Specifications

### 3.1 Tasks (Enterprise Work Management)

**Benchmark:** Asana task detail · Linear issue · Notion database row · Jira issue

#### Entity: `task`

```
TaskStatusValues = ["draft", "open", "in_progress", "review", "blocked", "done", "cancelled", "archived"]
TaskPriorityValues = ["critical", "high", "medium", "low", "none"]
TaskTypeValues = ["task", "bug", "feature", "improvement", "question"]
```

**Core Fields:**

| Field                    | Type                   | Description                                            |
| ------------------------ | ---------------------- | ------------------------------------------------------ |
| `id`                     | uuid                   | Primary key                                            |
| `orgId`                  | uuid                   | Tenant isolation                                       |
| `projectId`              | uuid (nullable)        | Parent project                                         |
| `parentTaskId`           | uuid (nullable)        | Subtask hierarchy                                      |
| `taskNumber`             | string                 | Auto-generated sequential (`TASK-001`)                 |
| `title`                  | string(500)            | Title                                                  |
| `description`            | text (nullable)        | Rich text / markdown body                              |
| `status`                 | enum                   | Lifecycle state                                        |
| `priority`               | enum                   | Urgency level                                          |
| `taskType`               | enum                   | Classification                                         |
| `assigneeId`             | uuid (nullable)        | Primary owner (principal)                              |
| `reporterId`             | uuid                   | Creator (principal)                                    |
| `dueDate`                | date (nullable)        | Target completion                                      |
| `startDate`              | date (nullable)        | Planned start                                          |
| `estimateMinutes`        | integer (nullable)     | Time estimate                                          |
| `actualMinutes`          | integer (nullable)     | Time tracked                                           |
| `completedAt`            | timestamptz (nullable) | When status → done                                     |
| `completedByPrincipalId` | uuid (nullable)        | Who completed                                          |
| `sortOrder`              | integer                | Manual ordering within project/board                   |
| `contextEntityType`      | string (nullable)      | Linked entity type (`invoice`, `supplier`, `approval`) |
| `contextEntityId`        | uuid (nullable)        | Linked entity ID                                       |
| `slaBreachAt`            | timestamptz (nullable) | Computed SLA deadline                                  |
| `createdAt`              | timestamptz            | Immutable                                              |
| `updatedAt`              | timestamptz            | Last mutation                                          |

**Related Entities:**

| Entity                | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `task_checklist_item` | Checklist items within a task (ordered, checkable) |
| `task_label`          | Junction: task ↔ label (many-to-many)             |
| `task_watcher`        | Users subscribed to task changes                   |
| `task_status_history` | Append-only status transition log                  |
| `task_time_entry`     | Time tracking entries per task                     |

**Commands:**

| Command                | Key Fields                                                    | Event                          |
| ---------------------- | ------------------------------------------------------------- | ------------------------------ |
| `CreateTask`           | title, projectId?, assigneeId?, priority, dueDate?            | `COMM.TASK_CREATED`            |
| `UpdateTask`           | taskId, title?, description?, priority?, dueDate?, startDate? | `COMM.TASK_UPDATED`            |
| `AssignTask`           | taskId, assigneeId                                            | `COMM.TASK_ASSIGNED`           |
| `TransitionTaskStatus` | taskId, toStatus, reason?                                     | `COMM.TASK_STATUS_CHANGED`     |
| `CompleteTask`         | taskId, actualMinutes?                                        | `COMM.TASK_COMPLETED`          |
| `ArchiveTask`          | taskId                                                        | `COMM.TASK_ARCHIVED`           |
| `AddChecklist`         | taskId, items[]                                               | `COMM.TASK_CHECKLIST_ADDED`    |
| `ToggleChecklistItem`  | taskId, checklistItemId, checked                              | `COMM.TASK_CHECKLIST_TOGGLED`  |
| `BulkAssignTasks`      | taskIds[], assigneeId                                         | `COMM.TASKS_BULK_ASSIGNED`     |
| `BulkTransitionStatus` | taskIds[], toStatus                                           | `COMM.TASKS_BULK_TRANSITIONED` |
| `AddTaskLabel`         | taskId, labelId                                               | —                              |
| `RemoveTaskLabel`      | taskId, labelId                                               | —                              |
| `WatchTask`            | taskId                                                        | —                              |
| `UnwatchTask`          | taskId                                                        | —                              |
| `LogTimeEntry`         | taskId, minutes, description?, date                           | `COMM.TASK_TIME_LOGGED`        |

**Query Views:**

| View        | Filter                                                       | Sort              | Description         |
| ----------- | ------------------------------------------------------------ | ----------------- | ------------------- |
| My Tasks    | `assigneeId = me`                                            | priority, dueDate | Owner's workload    |
| Team Board  | `projectId = X`                                              | sortOrder         | Kanban by status    |
| Due Today   | `dueDate = today, status NOT IN (done, cancelled, archived)` | priority          | Urgency view        |
| Blocked     | `status = blocked`                                           | updatedAt         | Attention queue     |
| SLA At Risk | `slaBreachAt < now + 24h, status NOT IN (done)`              | slaBreachAt       | Compliance view     |
| All Tasks   | `orgId = active`                                             | createdAt         | Full paginated list |
| Subtasks    | `parentTaskId = X`                                           | sortOrder         | Subtask tree        |

**Routes:**

| Method | Path                                       | Handler                                   |
| ------ | ------------------------------------------ | ----------------------------------------- |
| GET    | `/v1/tasks`                                | List tasks (cursor-paginated, filterable) |
| GET    | `/v1/tasks/:id`                            | Get task detail                           |
| POST   | `/v1/commands/create-task`                 | Create                                    |
| POST   | `/v1/commands/update-task`                 | Update                                    |
| POST   | `/v1/commands/assign-task`                 | Assign                                    |
| POST   | `/v1/commands/transition-task-status`      | Status change                             |
| POST   | `/v1/commands/complete-task`               | Complete                                  |
| POST   | `/v1/commands/archive-task`                | Archive                                   |
| POST   | `/v1/commands/bulk-assign-tasks`           | Bulk assign                               |
| POST   | `/v1/commands/bulk-transition-task-status` | Bulk status                               |
| POST   | `/v1/commands/add-task-checklist`          | Add checklist                             |
| POST   | `/v1/commands/toggle-checklist-item`       | Toggle checklist                          |
| POST   | `/v1/commands/log-task-time-entry`         | Log time                                  |
| GET    | `/v1/tasks/:id/activity`                   | Activity feed                             |
| GET    | `/v1/tasks/:id/comments`                   | Comments                                  |
| POST   | `/v1/commands/add-task-comment`            | Add comment                               |

**Web Pages:**

| Page        | Path                | Description                                    |
| ----------- | ------------------- | ---------------------------------------------- |
| Task List   | `/comm/tasks`       | Filterable table with saved views              |
| My Tasks    | `/comm/tasks/my`    | Personal workload view                         |
| Team Board  | `/comm/tasks/board` | Kanban board by status columns                 |
| Task Detail | `/comm/tasks/[id]`  | Full detail with activity, comments, checklist |
| New Task    | `/comm/tasks/new`   | Create form (or modal from any view)           |

---

### 3.2 Projects (Project Containers)

**Benchmark:** Asana project · Monday workspace · Notion database · Microsoft Planner plan

#### Entity: `project`

```
ProjectStatusValues = ["planning", "active", "on_hold", "completed", "cancelled", "archived"]
ProjectVisibilityValues = ["org", "team", "private"]
```

**Core Fields:**

| Field           | Type                   | Description                     |
| --------------- | ---------------------- | ------------------------------- |
| `id`            | uuid                   | Primary key                     |
| `orgId`         | uuid                   | Tenant isolation                |
| `projectNumber` | string                 | Auto-generated (`PRJ-001`)      |
| `name`          | string(200)            | Project name                    |
| `description`   | text (nullable)        | Rich text summary               |
| `status`        | enum                   | Lifecycle state                 |
| `visibility`    | enum                   | Access scope                    |
| `ownerId`       | uuid                   | Project owner (principal)       |
| `startDate`     | date (nullable)        | Planned start                   |
| `targetDate`    | date (nullable)        | Target completion               |
| `completedAt`   | timestamptz (nullable) | Actual completion               |
| `color`         | string(7) (nullable)   | Hex color for UI identification |
| `createdAt`     | timestamptz            | Immutable                       |
| `updatedAt`     | timestamptz            | Last mutation                   |

**Related Entities:**

| Entity                   | Purpose                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `project_member`         | Users with roles in a project (owner, editor, viewer)             |
| `project_milestone`      | Named milestones with target dates                                |
| `project_phase`          | Sequential project phases (planning, design, build, test, deploy) |
| `project_status_history` | Append-only status log                                            |

**Commands:**

| Command                   | Event                         |
| ------------------------- | ----------------------------- |
| `CreateProject`           | `COMM.PROJECT_CREATED`        |
| `UpdateProject`           | `COMM.PROJECT_UPDATED`        |
| `AddProjectMember`        | `COMM.PROJECT_MEMBER_ADDED`   |
| `RemoveProjectMember`     | `COMM.PROJECT_MEMBER_REMOVED` |
| `CreateMilestone`         | `COMM.MILESTONE_CREATED`      |
| `CompleteMilestone`       | `COMM.MILESTONE_COMPLETED`    |
| `TransitionProjectStatus` | `COMM.PROJECT_STATUS_CHANGED` |
| `ArchiveProject`          | `COMM.PROJECT_ARCHIVED`       |

**Routes:**

| Method | Path                              | Handler               |
| ------ | --------------------------------- | --------------------- |
| GET    | `/v1/projects`                    | List projects         |
| GET    | `/v1/projects/:id`                | Get project detail    |
| GET    | `/v1/projects/:id/tasks`          | List tasks in project |
| GET    | `/v1/projects/:id/milestones`     | List milestones       |
| POST   | `/v1/commands/create-project`     | Create                |
| POST   | `/v1/commands/update-project`     | Update                |
| POST   | `/v1/commands/add-project-member` | Add member            |

**Web Pages:**

| Page             | Path                           |
| ---------------- | ------------------------------ |
| Project List     | `/comm/projects`               |
| Project Detail   | `/comm/projects/[id]`          |
| Project Board    | `/comm/projects/[id]/board`    |
| Project Timeline | `/comm/projects/[id]/timeline` |

---

### 3.3 Approvals (Multi-Step Approval Engine)

**Benchmark:** ServiceNow approval workflows · SAP workflow · Oracle approvals · DocuSign routing

#### Entity: `approval_request`

```
ApprovalStatusValues = ["pending", "approved", "rejected", "escalated", "expired", "withdrawn"]
ApprovalStepStatusValues = ["pending", "approved", "rejected", "skipped", "delegated"]
```

**Core Fields:**

| Field                    | Type                              | Description                                                    |
| ------------------------ | --------------------------------- | -------------------------------------------------------------- |
| `id`                     | uuid                              | Primary key                                                    |
| `orgId`                  | uuid                              | Tenant isolation                                               |
| `approvalNumber`         | string                            | Auto-generated (`APR-001`)                                     |
| `title`                  | string(500)                       | Human-readable description                                     |
| `sourceEntityType`       | string                            | Origin entity (`invoice`, `purchase_order`, `task`, `expense`) |
| `sourceEntityId`         | uuid                              | Origin entity ID                                               |
| `requestedByPrincipalId` | uuid                              | Who requested approval                                         |
| `status`                 | enum                              | Overall approval status                                        |
| `currentStepIndex`       | integer                           | Active step in chain                                           |
| `totalSteps`             | integer                           | Number of steps                                                |
| `urgency`                | enum(critical, high, normal, low) | Priority level                                                 |
| `dueDate`                | date (nullable)                   | SLA deadline                                                   |
| `resolvedAt`             | timestamptz (nullable)            | Final resolution timestamp                                     |
| `resolvedByPrincipalId`  | uuid (nullable)                   | Final resolver                                                 |
| `createdAt`              | timestamptz                       | Immutable                                                      |
| `updatedAt`              | timestamptz                       | Last mutation                                                  |

**Related Entities:**

| Entity                    | Purpose                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `approval_step`           | Ordered steps in the chain (step 1 = manager, step 2 = finance, step 3 = director) |
| `approval_delegation`     | Delegation rules: user A delegates to user B during date range                     |
| `approval_policy`         | Org-level rules: amount thresholds, auto-approve conditions, escalation timers     |
| `approval_status_history` | Append-only status transitions                                                     |

**Commands:**

| Command                 | Event                          |
| ----------------------- | ------------------------------ |
| `CreateApprovalRequest` | `COMM.APPROVAL_REQUESTED`      |
| `ApproveStep`           | `COMM.APPROVAL_STEP_APPROVED`  |
| `RejectStep`            | `COMM.APPROVAL_STEP_REJECTED`  |
| `DelegateStep`          | `COMM.APPROVAL_STEP_DELEGATED` |
| `EscalateApproval`      | `COMM.APPROVAL_ESCALATED`      |
| `WithdrawApproval`      | `COMM.APPROVAL_WITHDRAWN`      |
| `CreateApprovalPolicy`  | `COMM.APPROVAL_POLICY_CREATED` |
| `SetDelegation`         | `COMM.APPROVAL_DELEGATION_SET` |

**Routes:**

| Method | Path                                   |
| ------ | -------------------------------------- |
| GET    | `/v1/approvals`                        |
| GET    | `/v1/approvals/:id`                    |
| GET    | `/v1/approvals/pending`                |
| POST   | `/v1/commands/create-approval-request` |
| POST   | `/v1/commands/approve-step`            |
| POST   | `/v1/commands/reject-step`             |
| POST   | `/v1/commands/delegate-step`           |
| POST   | `/v1/commands/escalate-approval`       |

**Web Pages:**

| Page            | Path                       |
| --------------- | -------------------------- |
| Approval Queue  | `/comm/approvals`          |
| My Pending      | `/comm/approvals/pending`  |
| Approval Detail | `/comm/approvals/[id]`     |
| Policies        | `/comm/approvals/policies` |

---

### 3.4 Boardroom (Board Governance)

**Benchmark:** Diligent Boards · BoardEffect · Azeus Convene · Board Intelligence

#### Entity: `board_meeting`

```
MeetingStatusValues = ["draft", "scheduled", "in_progress", "adjourned", "completed", "cancelled"]
ResolutionStatusValues = ["proposed", "discussed", "approved", "rejected", "deferred", "tabled"]
VoteValues = ["for", "against", "abstain"]
```

**Core Fields:**

| Field            | Type                   | Description                           |
| ---------------- | ---------------------- | ------------------------------------- |
| `id`             | uuid                   | Primary key                           |
| `orgId`          | uuid                   | Tenant isolation                      |
| `meetingNumber`  | string                 | Auto-generated (`MTG-001`)            |
| `title`          | string(300)            | Meeting title                         |
| `description`    | text (nullable)        | Purpose and objectives                |
| `status`         | enum                   | Meeting lifecycle                     |
| `scheduledAt`    | timestamptz            | Date and time                         |
| `duration`       | integer                | Planned duration (minutes)            |
| `location`       | string(300) (nullable) | Physical or virtual location          |
| `chairId`        | uuid                   | Meeting chair (principal)             |
| `secretaryId`    | uuid (nullable)        | Minutes recorder                      |
| `quorumRequired` | integer                | Minimum attendees for valid decisions |
| `startedAt`      | timestamptz (nullable) | Actual start                          |
| `adjournedAt`    | timestamptz (nullable) | End time                              |
| `createdAt`      | timestamptz            | Immutable                             |
| `updatedAt`      | timestamptz            | Last mutation                         |

**Related Entities:**

| Entity                   | Purpose                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| `board_meeting_attendee` | Invited members with attendance status (invited, confirmed, attended, absent) |
| `board_agenda_item`      | Ordered agenda items with presenter, time allocation, documents               |
| `board_resolution`       | Formal resolutions with voting record                                         |
| `board_resolution_vote`  | Individual voting record per member per resolution                            |
| `board_minutes`          | Meeting minutes (rich text, approval workflow)                                |
| `board_action_item`      | Post-meeting action items (linked to `task` module)                           |

**Commands:**

| Command             | Event                      |
| ------------------- | -------------------------- |
| `CreateMeeting`     | `COMM.MEETING_CREATED`     |
| `UpdateMeeting`     | `COMM.MEETING_UPDATED`     |
| `AddAgendaItem`     | `COMM.AGENDA_ITEM_ADDED`   |
| `StartMeeting`      | `COMM.MEETING_STARTED`     |
| `ProposeResolution` | `COMM.RESOLUTION_PROPOSED` |
| `CastVote`          | `COMM.VOTE_CAST`           |
| `CloseVoting`       | `COMM.VOTING_CLOSED`       |
| `RecordMinutes`     | `COMM.MINUTES_RECORDED`    |
| `ApproveMinutes`    | `COMM.MINUTES_APPROVED`    |
| `AdjournMeeting`    | `COMM.MEETING_ADJOURNED`   |
| `CreateActionItem`  | `COMM.ACTION_ITEM_CREATED` |

**Web Pages:**

| Page             | Path                               |
| ---------------- | ---------------------------------- |
| Meeting Calendar | `/comm/boardroom`                  |
| Meeting Detail   | `/comm/boardroom/[id]`             |
| Meeting Agenda   | `/comm/boardroom/[id]/agenda`      |
| Resolutions      | `/comm/boardroom/[id]/resolutions` |
| Minutes          | `/comm/boardroom/[id]/minutes`     |
| New Meeting      | `/comm/boardroom/new`              |

---

### 3.5 Docs (Knowledge Base)

**Benchmark:** Notion pages · Confluence · Google Docs · Coda

#### Entity: `document`

```
DocumentStatusValues = ["draft", "published", "archived"]
DocumentTypeValues = ["page", "wiki", "sop", "template", "policy"]
```

**Core Fields:**

| Field            | Type                     | Description                                           |
| ---------------- | ------------------------ | ----------------------------------------------------- |
| `id`             | uuid                     | Primary key                                           |
| `orgId`          | uuid                     | Tenant isolation                                      |
| `parentDocId`    | uuid (nullable)          | Nested page hierarchy                                 |
| `title`          | string(500)              | Title                                                 |
| `content`        | text                     | Rich text content (stored as serialized editor state) |
| `documentType`   | enum                     | Classification                                        |
| `status`         | enum                     | Lifecycle                                             |
| `authorId`       | uuid                     | Creator (principal)                                   |
| `lastEditedById` | uuid                     | Last editor                                           |
| `visibility`     | enum(org, team, private) | Access scope                                          |
| `slug`           | string(200)              | URL-friendly path                                     |
| `version`        | integer                  | Monotonic version counter                             |
| `publishedAt`    | timestamptz (nullable)   | When published                                        |
| `createdAt`      | timestamptz              | Immutable                                             |
| `updatedAt`      | timestamptz              | Last mutation                                         |

**Related Entities:**

| Entity                  | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `document_version`      | Immutable version snapshots for history and rollback |
| `document_collaborator` | Real-time editing presence tracking                  |

**Web Pages:**

| Page          | Path              |
| ------------- | ----------------- |
| Doc Explorer  | `/comm/docs`      |
| Doc View/Edit | `/comm/docs/[id]` |
| New Document  | `/comm/docs/new`  |

---

### 3.6 Inbox (Unified Notification Center)

**Benchmark:** Gmail Priority Inbox · Notion inbox · GitHub notifications

#### Entity: `inbox_item`

```
InboxItemStatusValues = ["unread", "read", "actioned", "dismissed", "snoozed"]
InboxChannelValues = ["in_app", "email", "push", "sms"]
```

**Core Fields:**

| Field              | Type                   | Description                                              |
| ------------------ | ---------------------- | -------------------------------------------------------- |
| `id`               | uuid                   | Primary key                                              |
| `orgId`            | uuid                   | Tenant isolation                                         |
| `recipientId`      | uuid                   | Target principal                                         |
| `channel`          | enum                   | Delivery channel                                         |
| `status`           | enum                   | Read state                                               |
| `subject`          | string(500)            | Notification title                                       |
| `body`             | text                   | Notification content                                     |
| `sourceModule`     | string                 | Origin module (`tasks`, `approvals`, `boardroom`, `erp`) |
| `sourceEntityType` | string                 | Entity type (`task`, `approval_request`, `invoice`)      |
| `sourceEntityId`   | uuid                   | Entity ID for deep linking                               |
| `actionUrl`        | string (nullable)      | Deep link path                                           |
| `snoozedUntil`     | timestamptz (nullable) | Snooze expiry                                            |
| `createdAt`        | timestamptz            | Immutable                                                |
| `readAt`           | timestamptz (nullable) | When marked read                                         |

**Web Pages:**

| Page           | Path                      |
| -------------- | ------------------------- |
| Inbox          | `/comm/inbox`             |
| Inbox — Unread | `/comm/inbox/unread`      |
| Preferences    | `/comm/inbox/preferences` |

---

### 3.7 Announcements (Organization Broadcasting)

**Benchmark:** Slack announcements · Teams org-wide posts · Corporate portals

#### Entity: `announcement`

```
AnnouncementStatusValues = ["draft", "scheduled", "published", "expired", "archived"]
AnnouncementPriorityValues = ["critical", "important", "standard", "informational"]
```

**Core Fields:**

| Field         | Type                   | Description                      |
| ------------- | ---------------------- | -------------------------------- |
| `id`          | uuid                   | Primary key                      |
| `orgId`       | uuid                   | Tenant isolation                 |
| `title`       | string(300)            | Headline                         |
| `body`        | text                   | Rich text content                |
| `status`      | enum                   | Lifecycle                        |
| `priority`    | enum                   | Visibility urgency               |
| `authorId`    | uuid                   | Publisher (principal)            |
| `publishAt`   | timestamptz (nullable) | Scheduled publish time           |
| `expiresAt`   | timestamptz (nullable) | Auto-archive time                |
| `requiresAck` | boolean                | Whether members must acknowledge |
| `publishedAt` | timestamptz (nullable) | Actual publish time              |
| `createdAt`   | timestamptz            | Immutable                        |
| `updatedAt`   | timestamptz            | Last mutation                    |

**Related Entities:**

| Entity                         | Purpose                                              |
| ------------------------------ | ---------------------------------------------------- |
| `announcement_acknowledgement` | Per-member acknowledgement tracking (who, when)      |
| `announcement_audience`        | Target audience rules (all, team, role, individuals) |

**Web Pages:**

| Page              | Path                       |
| ----------------- | -------------------------- |
| Announcement Feed | `/comm/announcements`      |
| Create            | `/comm/announcements/new`  |
| Detail            | `/comm/announcements/[id]` |

---

### 3.8 Chatter (Contextual Discussions)

**Benchmark:** Slack threads · Salesforce Chatter · GitHub discussions

#### Entity: `chatter_thread`

Chatter attaches to **any entity** in the system. A thread is a conversation context.

**Core Fields:**

| Field        | Type        | Description        |
| ------------ | ----------- | ------------------ |
| `id`         | uuid        | Primary key        |
| `orgId`      | uuid        | Tenant isolation   |
| `entityType` | string      | Parent entity type |
| `entityId`   | uuid        | Parent entity ID   |
| `createdAt`  | timestamptz | Immutable          |

**Related:** `chatter_message` (thread messages with rich text, mentions, reactions)

**Web:** Rendered as side panel on any entity detail page (no standalone route).

---

### 3.9 Workflows (Automation Engine)

**Benchmark:** Zapier · Power Automate · n8n · ServiceNow Flow Designer

#### Entity: `workflow_rule`

```
WorkflowTriggerValues = ["on_create", "on_status_change", "on_field_change", "on_sla_breach", "on_schedule"]
WorkflowActionValues = ["assign", "send_notification", "create_task", "create_approval", "update_field", "webhook"]
```

**Core Fields:**

| Field              | Type                   | Description                                |
| ------------------ | ---------------------- | ------------------------------------------ |
| `id`               | uuid                   | Primary key                                |
| `orgId`            | uuid                   | Tenant isolation                           |
| `name`             | string(200)            | Rule name                                  |
| `description`      | text (nullable)        | Purpose                                    |
| `sourceModule`     | string                 | Target module (`tasks`, `approvals`, etc.) |
| `sourceEntityType` | string                 | Entity type to watch                       |
| `triggerType`      | enum                   | When to fire                               |
| `triggerCondition` | jsonb                  | Condition expression                       |
| `actions`          | jsonb                  | Ordered action definitions                 |
| `isActive`         | boolean                | Enabled/disabled                           |
| `lastTriggeredAt`  | timestamptz (nullable) | Last execution                             |
| `executionCount`   | integer                | Total executions                           |
| `createdAt`        | timestamptz            | Immutable                                  |
| `updatedAt`        | timestamptz            | Last mutation                              |

**Web Pages:**

| Page             | Path                   |
| ---------------- | ---------------------- |
| Workflow List    | `/comm/workflows`      |
| Workflow Builder | `/comm/workflows/new`  |
| Workflow Detail  | `/comm/workflows/[id]` |

---

## 4. Shared Infrastructure Entities

### 4.1 Comments (`comm_comment`)

| Field             | Type                   | Description                                                     |
| ----------------- | ---------------------- | --------------------------------------------------------------- |
| `id`              | uuid                   | PK                                                              |
| `orgId`           | uuid                   | Tenant                                                          |
| `entityType`      | string                 | Parent type (`task`, `project`, `approval_request`, `document`) |
| `entityId`        | uuid                   | Parent ID                                                       |
| `parentCommentId` | uuid (nullable)        | Thread reply                                                    |
| `authorId`        | uuid                   | Writer (principal)                                              |
| `body`            | text                   | Rich text                                                       |
| `editedAt`        | timestamptz (nullable) | Last edit                                                       |
| `createdAt`       | timestamptz            | Immutable                                                       |

### 4.2 Labels (`comm_label`)

| Field       | Type        | Description |
| ----------- | ----------- | ----------- |
| `id`        | uuid        | PK          |
| `orgId`     | uuid        | Tenant      |
| `name`      | string(50)  | Label name  |
| `color`     | string(7)   | Hex color   |
| `createdAt` | timestamptz | Immutable   |

### 4.3 Saved Views (`comm_saved_view`)

| Field         | Type            | Description                     |
| ------------- | --------------- | ------------------------------- |
| `id`          | uuid            | PK                              |
| `orgId`       | uuid            | Tenant                          |
| `principalId` | uuid (nullable) | User-scoped (null = org-shared) |
| `entityType`  | string          | Target entity type              |
| `name`        | string(100)     | View name                       |
| `filters`     | jsonb           | Filter criteria                 |
| `sortBy`      | jsonb           | Sort configuration              |
| `columns`     | jsonb           | Visible columns                 |
| `isDefault`   | boolean         | Default for this user/entity    |
| `createdAt`   | timestamptz     | Immutable                       |
| `updatedAt`   | timestamptz     | Last mutation                   |

### 4.4 Subscriptions (`comm_subscription`)

| Field         | Type        | Description         |
| ------------- | ----------- | ------------------- |
| `id`          | uuid        | PK                  |
| `orgId`       | uuid        | Tenant              |
| `principalId` | uuid        | Subscriber          |
| `entityType`  | string      | Watched entity type |
| `entityId`    | uuid        | Watched entity ID   |
| `createdAt`   | timestamptz | Immutable           |

---

## 5. Complete File Manifest

### 5.1 Contracts Layer (`packages/contracts/src/comm/`)

```
comm/
├── index.ts                              # Barrel: re-exports all modules
├── shared/
│   ├── comment.ts                        # CommCommentSchema, AddCommentCommandSchema
│   ├── label.ts                          # CommLabelSchema, CreateLabelCommandSchema
│   ├── saved-view.ts                     # CommSavedViewSchema, SaveViewCommandSchema
│   ├── subscription.ts                   # CommSubscriptionSchema
│   └── index.ts                          # Shared barrel
├── tasks/
│   ├── task.entity.ts                    # TaskSchema, TaskStatusValues, TaskPriorityValues, TaskTypeValues
│   ├── task.commands.ts                  # Create/Update/Assign/Transition/Complete/Archive/Bulk commands
│   ├── task-checklist-item.entity.ts     # TaskChecklistItemSchema
│   ├── task-checklist-item.commands.ts   # Add/Toggle/Remove checklist commands
│   ├── task-time-entry.entity.ts         # TaskTimeEntrySchema
│   ├── task-time-entry.commands.ts       # LogTimeEntry command
│   ├── task-watcher.entity.ts            # TaskWatcherSchema
│   ├── OWNERS.md
│   └── index.ts
├── projects/
│   ├── project.entity.ts                # ProjectSchema, ProjectStatusValues, ProjectVisibilityValues
│   ├── project.commands.ts              # Create/Update/Archive/AddMember/RemoveMember commands
│   ├── project-member.entity.ts         # ProjectMemberSchema, ProjectRoleValues
│   ├── project-milestone.entity.ts      # ProjectMilestoneSchema
│   ├── project-milestone.commands.ts    # Create/Complete milestone commands
│   ├── OWNERS.md
│   └── index.ts
├── approvals/
│   ├── approval-request.entity.ts       # ApprovalRequestSchema, ApprovalStatusValues
│   ├── approval-request.commands.ts     # Create/Approve/Reject/Delegate/Escalate/Withdraw commands
│   ├── approval-step.entity.ts          # ApprovalStepSchema
│   ├── approval-delegation.entity.ts    # ApprovalDelegationSchema
│   ├── approval-policy.entity.ts        # ApprovalPolicySchema
│   ├── OWNERS.md
│   └── index.ts
├── boardroom/
│   ├── meeting.entity.ts               # BoardMeetingSchema, MeetingStatusValues
│   ├── meeting.commands.ts             # Create/Start/Adjourn/Cancel commands
│   ├── agenda-item.entity.ts           # BoardAgendaItemSchema
│   ├── agenda-item.commands.ts         # Add/Reorder/Remove agenda commands
│   ├── resolution.entity.ts            # BoardResolutionSchema, ResolutionStatusValues
│   ├── resolution.commands.ts          # Propose/CastVote/CloseVoting commands
│   ├── resolution-vote.entity.ts       # BoardResolutionVoteSchema, VoteValues
│   ├── minutes.entity.ts               # BoardMinutesSchema
│   ├── minutes.commands.ts             # Record/Approve minutes commands
│   ├── action-item.entity.ts           # BoardActionItemSchema (→ links to task)
│   ├── attendee.entity.ts              # BoardMeetingAttendeeSchema
│   ├── OWNERS.md
│   └── index.ts
├── inbox/
│   ├── inbox-item.entity.ts            # InboxItemSchema, InboxItemStatusValues, InboxChannelValues
│   ├── inbox-item.commands.ts          # MarkRead/Dismiss/Snooze/BulkMarkRead commands
│   ├── notification-preference.entity.ts # NotificationPreferenceSchema
│   ├── OWNERS.md
│   └── index.ts
├── announcements/
│   ├── announcement.entity.ts          # AnnouncementSchema, AnnouncementStatusValues
│   ├── announcement.commands.ts        # Create/Publish/Schedule/Archive commands
│   ├── acknowledgement.entity.ts       # AnnouncementAcknowledgementSchema
│   ├── audience.entity.ts              # AnnouncementAudienceSchema
│   ├── OWNERS.md
│   └── index.ts
├── docs/
│   ├── document.entity.ts             # DocumentSchema, DocumentStatusValues, DocumentTypeValues
│   ├── document.commands.ts            # Create/Update/Publish/Archive commands
│   ├── document-version.entity.ts      # DocumentVersionSchema (immutable snapshots)
│   ├── OWNERS.md
│   └── index.ts
├── chatter/
│   ├── thread.entity.ts               # ChatterThreadSchema
│   ├── message.entity.ts              # ChatterMessageSchema
│   ├── message.commands.ts            # PostMessage/EditMessage/DeleteMessage commands
│   ├── OWNERS.md
│   └── index.ts
└── workflows/
    ├── workflow-rule.entity.ts         # WorkflowRuleSchema, TriggerValues, ActionValues
    ├── workflow-rule.commands.ts        # Create/Update/Activate/Deactivate commands
    ├── workflow-execution.entity.ts    # WorkflowExecutionSchema (run log)
    ├── OWNERS.md
    └── index.ts
```

### 5.2 DB Schema Layer (`packages/db/src/schema/comm/`)

```
comm/
├── index.ts                             # Barrel re-exports all tables
├── shared.ts                            # comm_comment, comm_label, comm_saved_view, comm_subscription tables
├── tasks.ts                             # task, task_checklist_item, task_label, task_watcher, task_status_history, task_time_entry tables
├── projects.ts                          # project, project_member, project_milestone, project_phase, project_status_history tables
├── approvals.ts                         # approval_request, approval_step, approval_delegation, approval_policy, approval_status_history tables
├── boardroom.ts                         # board_meeting, board_agenda_item, board_resolution, board_resolution_vote, board_minutes, board_meeting_attendee, board_action_item tables
├── inbox.ts                             # inbox_item, notification_preference tables
├── announcements.ts                     # announcement, announcement_acknowledgement, announcement_audience tables
├── docs.ts                              # document, document_version, document_collaborator tables
├── chatter.ts                           # chatter_thread, chatter_message tables
└── workflows.ts                         # workflow_rule, workflow_execution tables
```

### 5.3 Core Services Layer (`packages/core/src/comm/`)

```
comm/
├── index.ts                             # Barrel
├── shared/
│   ├── comment.service.ts               # addComment, editComment, deleteComment
│   ├── comment.queries.ts               # listComments (cursor-paginated)
│   ├── label.service.ts                 # createLabel, deleteLabel
│   ├── label.queries.ts                 # listLabels
│   ├── saved-view.service.ts            # saveView, updateView, deleteView
│   ├── saved-view.queries.ts            # listViews
│   ├── subscription.service.ts          # subscribe, unsubscribe
│   └── index.ts
├── tasks/
│   ├── task.service.ts                  # createTask, updateTask, assignTask, transitionStatus, completeTask, archiveTask
│   ├── task.queries.ts                  # listTasks, getTaskById (cursor-paginated, filterable)
│   ├── task-checklist.service.ts        # addChecklist, toggleItem
│   ├── task-time-entry.service.ts       # logTimeEntry
│   ├── task-bulk.service.ts             # bulkAssign, bulkTransition
│   ├── OWNERS.md
│   ├── __vitest_test__/
│   │   ├── task.service.test.ts
│   │   ├── task.queries.test.ts
│   │   └── task-bulk.service.test.ts
│   └── index.ts
├── projects/
│   ├── project.service.ts
│   ├── project.queries.ts
│   ├── project-member.service.ts
│   ├── project-milestone.service.ts
│   ├── OWNERS.md
│   ├── __vitest_test__/
│   └── index.ts
├── approvals/
│   ├── approval.service.ts             # createRequest, approveStep, rejectStep, delegateStep, escalate
│   ├── approval.queries.ts             # listApprovals, getPendingForUser, getRequestById
│   ├── approval-policy.service.ts      # createPolicy, evaluatePolicy
│   ├── approval-delegation.service.ts  # setDelegation, findActiveDelegate
│   ├── OWNERS.md
│   ├── __vitest_test__/
│   └── index.ts
├── boardroom/
│   ├── meeting.service.ts
│   ├── meeting.queries.ts
│   ├── agenda.service.ts
│   ├── resolution.service.ts
│   ├── resolution-vote.service.ts
│   ├── minutes.service.ts
│   ├── OWNERS.md
│   ├── __vitest_test__/
│   └── index.ts
├── inbox/
│   ├── inbox.service.ts                # markRead, dismiss, snooze, bulkMarkRead
│   ├── inbox.queries.ts                # listInboxItems, getUnreadCount
│   ├── inbox-dispatch.service.ts       # dispatchNotification (called by other modules via outbox)
│   ├── notification-preference.service.ts
│   ├── OWNERS.md
│   ├── __vitest_test__/
│   └── index.ts
├── announcements/
│   ├── announcement.service.ts
│   ├── announcement.queries.ts
│   ├── announcement-audience.service.ts
│   ├── OWNERS.md
│   ├── __vitest_test__/
│   └── index.ts
├── docs/
│   ├── document.service.ts
│   ├── document.queries.ts
│   ├── document-version.service.ts
│   ├── OWNERS.md
│   ├── __vitest_test__/
│   └── index.ts
├── chatter/
│   ├── chatter.service.ts
│   ├── chatter.queries.ts
│   ├── OWNERS.md
│   ├── __vitest_test__/
│   └── index.ts
└── workflows/
    ├── workflow.service.ts
    ├── workflow.queries.ts
    ├── workflow-evaluator.ts            # Trigger evaluation engine
    ├── workflow-executor.ts             # Action execution engine
    ├── OWNERS.md
    ├── __vitest_test__/
    └── index.ts
```

### 5.4 API Routes Layer (`apps/api/src/routes/comm/`)

```
comm/
├── tasks.ts                             # Task CRUD + bulk + checklist + time entry routes
├── projects.ts                          # Project CRUD + members + milestones routes
├── approvals.ts                         # Approval request + step + delegation + policy routes
├── boardroom.ts                         # Meeting + agenda + resolution + vote + minutes routes
├── inbox.ts                             # Inbox items + preferences routes
├── announcements.ts                     # Announcement CRUD + acknowledgement routes
├── docs.ts                              # Document CRUD + version routes
├── chatter.ts                           # Thread + message routes
├── workflows.ts                         # Workflow rule CRUD + execution routes
├── shared.ts                            # Comment + label + saved-view routes (cross-module)
└── OWNERS.md
```

### 5.5 Worker Handlers Layer (`apps/worker/src/jobs/comm/`)

```
comm/
├── index.ts                             # Task registration for all comm handlers
├── tasks/
│   ├── handle-task-created.ts           # → dispatch inbox notification to watchers
│   ├── handle-task-assigned.ts          # → dispatch inbox notification to assignee
│   ├── handle-task-completed.ts         # → update project progress, dispatch notification
│   ├── handle-task-sla-breach.ts        # → escalation notification, workflow trigger
│   └── handle-task-status-changed.ts    # → update project metrics, notify watchers
├── projects/
│   ├── handle-project-created.ts        # → notify project members
│   └── handle-milestone-completed.ts    # → update project status, notify owner
├── approvals/
│   ├── handle-approval-requested.ts     # → notify approver(s)
│   ├── handle-approval-step-approved.ts # → advance chain or resolve
│   ├── handle-approval-step-rejected.ts # → notify requester, resolve chain
│   ├── handle-approval-escalated.ts     # → notify escalation target
│   └── handle-approval-sla-check.ts     # → scheduled: check pending approvals for SLA breach
├── boardroom/
│   ├── handle-meeting-created.ts        # → notify attendees
│   ├── handle-resolution-approved.ts    # → create action items as tasks
│   └── handle-minutes-approved.ts       # → distribute to attendees
├── inbox/
│   └── handle-notification-dispatch.ts  # → fan-out: in_app + email + push
├── announcements/
│   ├── handle-announcement-published.ts # → fan-out to audience
│   └── handle-announcement-scheduled.ts # → cron: publish scheduled announcements
├── docs/
│   └── handle-document-published.ts     # → notify subscribers
├── chatter/
│   └── handle-message-posted.ts         # → notify thread participants + @mentioned
└── workflows/
    └── handle-workflow-trigger.ts       # → evaluate conditions, execute actions
```

### 5.6 Web UI Layer (`apps/web/src/app/(comm)/`)

```
(comm)/
├── layout.tsx                           # Active-org guard (auth → org → render)
├── page.tsx                             # Comm hub landing (dashboard with widgets)
├── loading.tsx                          # Suspense fallback
│
├── tasks/
│   ├── page.tsx                         # Task list (table with saved views)
│   ├── loading.tsx
│   ├── error.tsx
│   ├── my/
│   │   └── page.tsx                     # My tasks view
│   ├── board/
│   │   └── page.tsx                     # Kanban board
│   ├── new/
│   │   └── page.tsx                     # Create task form
│   └── [id]/
│       ├── page.tsx                     # Task detail (tabs: detail, activity, comments, time)
│       ├── loading.tsx
│       └── error.tsx
│
├── projects/
│   ├── page.tsx                         # Project list
│   ├── loading.tsx
│   ├── new/
│   │   └── page.tsx
│   └── [id]/
│       ├── page.tsx                     # Project detail
│       ├── board/
│       │   └── page.tsx                 # Project kanban
│       ├── timeline/
│       │   └── page.tsx                 # Gantt / timeline
│       └── milestones/
│           └── page.tsx
│
├── approvals/
│   ├── page.tsx                         # Approval queue
│   ├── loading.tsx
│   ├── pending/
│   │   └── page.tsx                     # My pending approvals
│   ├── policies/
│   │   └── page.tsx                     # Approval policies management
│   └── [id]/
│       ├── page.tsx                     # Approval detail (step chain, history)
│       └── loading.tsx
│
├── boardroom/
│   ├── page.tsx                         # Meeting calendar / list
│   ├── loading.tsx
│   ├── new/
│   │   └── page.tsx                     # Create meeting
│   └── [id]/
│       ├── page.tsx                     # Meeting detail
│       ├── agenda/
│       │   └── page.tsx                 # Agenda management
│       ├── resolutions/
│       │   └── page.tsx                 # Resolution voting
│       └── minutes/
│           └── page.tsx                 # Minutes recording
│
├── inbox/
│   ├── page.tsx                         # Unified inbox
│   ├── loading.tsx
│   ├── unread/
│   │   └── page.tsx                     # Unread filter
│   └── preferences/
│       └── page.tsx                     # Notification preferences
│
├── announcements/
│   ├── page.tsx                         # Announcement feed
│   ├── loading.tsx
│   ├── new/
│   │   └── page.tsx                     # Create announcement
│   └── [id]/
│       └── page.tsx                     # Announcement detail + acknowledgements
│
├── docs/
│   ├── page.tsx                         # Document explorer (tree/grid)
│   ├── loading.tsx
│   ├── new/
│   │   └── page.tsx                     # Create document
│   └── [id]/
│       ├── page.tsx                     # Document viewer/editor
│       └── history/
│           └── page.tsx                 # Version history
│
└── workflows/
    ├── page.tsx                         # Workflow rule list
    ├── loading.tsx
    ├── new/
    │   └── page.tsx                     # Workflow builder
    └── [id]/
        ├── page.tsx                     # Workflow detail + execution log
        └── executions/
            └── page.tsx                 # Execution history
```

### 5.7 UI Meta Layer (`packages/ui/src/meta/entities/`)

```
entities/
├── comm.task.ts                         # Task entity registration (fields, views, actions)
├── comm.project.ts                      # Project entity registration
├── comm.approval-request.ts             # Approval entity registration
├── comm.board-meeting.ts                # Meeting entity registration
├── comm.document.ts                     # Document entity registration
├── comm.inbox-item.ts                   # Inbox entity registration
├── comm.announcement.ts                 # Announcement entity registration
```

All registered in `packages/ui/src/meta/registry.ts`.

---

## 6. Registry Entries

### 6.1 Error Codes (add to `packages/contracts/src/shared/errors.ts`)

```
// Tasks
COMM_TASK_NOT_FOUND
COMM_TASK_ALREADY_COMPLETED
COMM_TASK_ALREADY_ARCHIVED
COMM_TASK_INVALID_STATUS_TRANSITION
COMM_TASK_ASSIGNEE_NOT_IN_ORG
COMM_TASK_PARENT_NOT_FOUND
COMM_TASK_CIRCULAR_HIERARCHY

// Projects
COMM_PROJECT_NOT_FOUND
COMM_PROJECT_ALREADY_ARCHIVED
COMM_PROJECT_MEMBER_ALREADY_EXISTS
COMM_PROJECT_MEMBER_NOT_FOUND
COMM_MILESTONE_NOT_FOUND
COMM_MILESTONE_ALREADY_COMPLETED

// Approvals
COMM_APPROVAL_NOT_FOUND
COMM_APPROVAL_ALREADY_RESOLVED
COMM_APPROVAL_STEP_NOT_PENDING
COMM_APPROVAL_NOT_AUTHORIZED_APPROVER
COMM_APPROVAL_DELEGATION_CONFLICT
COMM_APPROVAL_POLICY_NOT_FOUND

// Boardroom
COMM_MEETING_NOT_FOUND
COMM_MEETING_ALREADY_STARTED
COMM_MEETING_NOT_IN_PROGRESS
COMM_MEETING_QUORUM_NOT_MET
COMM_RESOLUTION_NOT_FOUND
COMM_RESOLUTION_VOTING_CLOSED
COMM_VOTE_ALREADY_CAST
COMM_MINUTES_NOT_FOUND
COMM_MINUTES_ALREADY_APPROVED

// Docs
COMM_DOCUMENT_NOT_FOUND
COMM_DOCUMENT_ALREADY_PUBLISHED
COMM_DOCUMENT_VERSION_NOT_FOUND

// Inbox
COMM_INBOX_ITEM_NOT_FOUND

// Announcements
COMM_ANNOUNCEMENT_NOT_FOUND
COMM_ANNOUNCEMENT_ALREADY_PUBLISHED

// Shared
COMM_COMMENT_NOT_FOUND
COMM_LABEL_NOT_FOUND
COMM_LABEL_DUPLICATE
COMM_SAVED_VIEW_NOT_FOUND
COMM_WORKFLOW_NOT_FOUND
COMM_WORKFLOW_EVALUATION_FAILED
```

### 6.2 Permissions (add to `packages/contracts/src/shared/permissions.ts`)

```
// Tasks
comm.task.create
comm.task.read
comm.task.update
comm.task.assign
comm.task.complete
comm.task.archive
comm.task.bulk-assign
comm.task.bulk-transition

// Projects
comm.project.create
comm.project.read
comm.project.update
comm.project.archive
comm.project.manage-members

// Approvals
comm.approval.create
comm.approval.read
comm.approval.approve
comm.approval.reject
comm.approval.delegate
comm.approval.escalate
comm.approval.manage-policies

// Boardroom
comm.meeting.create
comm.meeting.read
comm.meeting.manage
comm.meeting.chair
comm.resolution.propose
comm.resolution.vote
comm.minutes.record
comm.minutes.approve

// Docs
comm.doc.create
comm.doc.read
comm.doc.update
comm.doc.publish
comm.doc.archive

// Inbox
comm.inbox.read
comm.inbox.manage-preferences

// Announcements
comm.announcement.create
comm.announcement.read
comm.announcement.publish
comm.announcement.manage

// Chatter
comm.chatter.post
comm.chatter.read
comm.chatter.moderate

// Workflows
comm.workflow.create
comm.workflow.read
comm.workflow.update
comm.workflow.activate
comm.workflow.manage

// Shared
comm.comment.create
comm.comment.read
comm.comment.delete
comm.label.create
comm.label.delete
comm.saved-view.create
comm.saved-view.delete
```

### 6.3 Audit Actions (add to `packages/contracts/src/kernel/governance/audit/actions.ts`)

```
// Tasks
task.created
task.updated
task.assigned
task.status_changed
task.completed
task.archived
task.checklist_added
task.checklist_toggled
task.time_logged
task.bulk_assigned
task.bulk_transitioned

// Projects
project.created
project.updated
project.member_added
project.member_removed
project.status_changed
project.archived
milestone.created
milestone.completed

// Approvals
approval.requested
approval.step_approved
approval.step_rejected
approval.step_delegated
approval.escalated
approval.withdrawn
approval.policy_created
approval.delegation_set

// Boardroom
meeting.created
meeting.updated
meeting.started
meeting.adjourned
meeting.cancelled
agenda_item.added
agenda_item.reordered
resolution.proposed
resolution.vote_cast
resolution.voting_closed
minutes.recorded
minutes.approved
action_item.created

// Docs
document.created
document.updated
document.published
document.archived
document.version_created

// Announcements
announcement.created
announcement.published
announcement.acknowledged
announcement.archived

// Chatter
chatter.message_posted
chatter.message_edited
chatter.message_deleted

// Workflows
workflow.created
workflow.updated
workflow.activated
workflow.deactivated
workflow.triggered
workflow.executed

// Shared
comment.created
comment.edited
comment.deleted
label.created
label.deleted
saved_view.created
saved_view.deleted
subscription.created
subscription.deleted
```

### 6.4 Outbox Event Types (add to `packages/contracts/src/kernel/execution/outbox/envelope.ts`)

```
COMM.TASK_CREATED
COMM.TASK_UPDATED
COMM.TASK_ASSIGNED
COMM.TASK_STATUS_CHANGED
COMM.TASK_COMPLETED
COMM.TASK_ARCHIVED
COMM.TASK_CHECKLIST_ADDED
COMM.TASK_CHECKLIST_TOGGLED
COMM.TASK_TIME_LOGGED
COMM.TASKS_BULK_ASSIGNED
COMM.TASKS_BULK_TRANSITIONED

COMM.PROJECT_CREATED
COMM.PROJECT_UPDATED
COMM.PROJECT_STATUS_CHANGED
COMM.PROJECT_ARCHIVED
COMM.PROJECT_MEMBER_ADDED
COMM.PROJECT_MEMBER_REMOVED
COMM.MILESTONE_CREATED
COMM.MILESTONE_COMPLETED

COMM.APPROVAL_REQUESTED
COMM.APPROVAL_STEP_APPROVED
COMM.APPROVAL_STEP_REJECTED
COMM.APPROVAL_STEP_DELEGATED
COMM.APPROVAL_ESCALATED
COMM.APPROVAL_WITHDRAWN
COMM.APPROVAL_POLICY_CREATED
COMM.APPROVAL_DELEGATION_SET

COMM.MEETING_CREATED
COMM.MEETING_STARTED
COMM.MEETING_ADJOURNED
COMM.RESOLUTION_PROPOSED
COMM.VOTE_CAST
COMM.VOTING_CLOSED
COMM.MINUTES_RECORDED
COMM.MINUTES_APPROVED
COMM.ACTION_ITEM_CREATED

COMM.DOCUMENT_CREATED
COMM.DOCUMENT_UPDATED
COMM.DOCUMENT_PUBLISHED

COMM.ANNOUNCEMENT_PUBLISHED
COMM.ANNOUNCEMENT_SCHEDULED

COMM.CHATTER_MESSAGE_POSTED

COMM.WORKFLOW_TRIGGERED
COMM.WORKFLOW_EXECUTED

COMM.INBOX_DISPATCHED
COMM.COMMENT_CREATED
```

---

## 7. Cross-Module Integration Map

### 7.1 Tasks ↔ Other Modules

| Integration         | Description                                               |
| ------------------- | --------------------------------------------------------- |
| Tasks → Projects    | Tasks belong to projects; project progress = % tasks done |
| Tasks → Approvals   | Task completion can trigger approval request              |
| Tasks → Boardroom   | Board resolution → auto-create action item task           |
| Tasks → Inbox       | Assignment/completion → inbox notification                |
| Tasks → Chatter     | Thread attached to task for discussion                    |
| Tasks → Workflows   | Status change triggers automation rules                   |
| Tasks ↔ ERP        | Context link: task references invoice/supplier/PO         |
| Tasks → Comments    | Polymorphic comments on task entity                       |
| Tasks → Labels      | User-defined categorization                               |
| Tasks → Saved Views | Persisted filter configurations                           |

### 7.2 Approvals ↔ ERP Integration

| Integration             | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| Invoice approval        | Invoice submit → create approval_request (source: `invoice`)    |
| Payment run approval    | Payment run → multi-step approval chain                         |
| Purchase order approval | PO create → approval based on amount threshold                  |
| Approval → Inbox        | Step assignment → inbox notification to approver                |
| Approval → Task         | Approval completion → create follow-up task                     |
| Approval policies       | Amount-based routing, role-based assignment, auto-approve rules |

### 7.3 Boardroom ↔ Tasks

| Integration             | Description                                                                    |
| ----------------------- | ------------------------------------------------------------------------------ |
| Resolution → Task       | Approved resolution → create task with resolution context                      |
| Action Item → Task      | Meeting action item stored as task with `contextEntityType = board_resolution` |
| Meeting → Announcements | Meeting outcomes → publish as announcement                                     |

### 7.4 Workflows ↔ Everything

| Integration     | Description                                                                    |
| --------------- | ------------------------------------------------------------------------------ |
| Trigger sources | Task status change, approval step, invoice status, meeting adjourn, SLA breach |
| Action targets  | Create task, send notification, start approval, update field, call webhook     |

---

## 8. Tenant and Routing Contract

### Authentication and Authorization Flow

```
1. Not authenticated → redirect `/auth/signin`
2. Authenticated, no active org → redirect `/auth/select-organization`
3. Active org invalid → clear cookie → redirect `/auth/select-organization`
4. Active org valid → render (comm) layout
5. Every API call → validate `X-Afenda-Org-Id` header against session
6. Every DB query → `withOrgContext(db, ctx)` → RLS enforcement
```

### Hard Preconditions (Non-Negotiable)

1. Tenant resolution is a hard precondition for all `comm` route rendering and all `comm` API calls.
2. No fallback tenant is allowed. Missing org context is an explicit error path.
3. Active org precedence is deterministic: Neon active-org claim → `active_org` server cookie → explicit selector.
4. Users with zero org memberships must always reach `/auth/onboarding` without middleware lockout.

### Tenant Primitives Contract

The auth service contract for `comm` must expose and test:

1. `listMyOrgs(userId)`
2. `getActiveOrg(userId)`
3. `setActiveOrg(userId, orgId)`

`setActiveOrg` must enforce membership and role authorization before persistence.

### Neon Claim to Cookie Resolution

At sign-in or session hydration:

1. Read Neon active org claim.
2. If claim exists and membership is valid, persist `active_org` cookie.
3. If claim missing, resolve from membership count:
   1. One org: set active org and continue.
   2. Multiple orgs: redirect to selector with callback.
   3. Zero orgs: redirect to onboarding.

### Middleware Enforcement

`proxy.ts` already enforces active org for `/app`, `/finance`, `/governance`, `/analytics`, `/admin` prefixes. **Add `/comm` to the `ACTIVE_ORG_REQUIRED_PREFIXES` list.**

Middleware must remain narrow and loop-safe:

1. Protect only business paths (`/comm/**`, `/app/**`, and existing protected domains).
2. Exempt auth routes, onboarding routes, webhook endpoints, health checks, and static assets.
3. Preserve original path in `callback` query.
4. Add redirect loop detection (`redirect_loop_detected`) with bounded retry behavior.

### Permission Enforcement

Every command checks permissions before execution:

```typescript
if (!hasPermission(ctx, "comm.task.create")) {
  return { ok: false, error: { code: "SHARED_FORBIDDEN" } };
}
```

---

## 9. Wave Execution Plan

### Wave 1: Foundation (Tasks + Shared Schema Baseline) ✅ COMPLETE

**Delivered:** March 12, 2026

| Step | Layer     | Work                                                                                                                                                                       | Status |
| ---- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.1  | Contracts | `comm/shared/` schemas (comment, label, saved-view, subscription)                                                                                                          | ✅     |
| 1.2  | Contracts | `comm/tasks/` schemas (entity, commands, checklist, watcher, time-entry)                                                                                                   | ✅     |
| 1.3  | Registry  | Error codes, permissions, audit actions, outbox events for tasks                                                                                                           | ✅     |
| 1.4  | DB        | `comm/shared.ts` + `comm/tasks.ts` tables with indexes, enums, RLS                                                                                                         | ✅     |
| 1.5  | DB        | Migration: `pnpm db:generate` + manual review + `pnpm db:migrate`                                                                                                          | ✅     |
| 1.6  | Core      | `comm/tasks/` services (CRUD, assign, transition, complete, archive)                                                                                                       | ✅     |
| 1.7  | Core      | `comm/tasks/` queries (list with cursor pagination, filters, sorts)                                                                                                        | ✅     |
| 1.8  | Core      | Unit tests: `__vitest_test__/` for task services + queries                                                                                                                 | ✅     |
| 1.9  | API       | `comm/tasks.ts` routes (all commands + queries, checklist, time-entry)                                                                                                     | ✅     |
| 1.10 | Worker    | 12 task event handlers (created, assigned, updated, completed, archived, status-changed, time-logged, checklist-added/removed/toggled, bulk-assigned, bulk-status-changed) | ✅     |
| 1.11 | Web       | `(comm)/layout.tsx` + `(comm)/page.tsx` (comm hub landing with quick stats)                                                                                                | ✅     |
| 1.12 | Web       | Task pages: **list** (paginated, filterable), **my** (assignee-scoped), **board** (DnD kanban), **detail** (checklist, time-entry, transitions), **new** (create form)     | ✅     |
| 1.13 | Gates     | `pnpm typecheck && pnpm test && pnpm check:all` — zero errors                                                                                                              | ✅     |

### Wave 2: Projects + Task Enhancements ✅ COMPLETE

**Delivered:** March 12–13, 2026

| Step | Layer     | Work                                                                                                                              | Status |
| ---- | --------- | --------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2.1  | Contracts | `comm/projects/` schemas (entity, commands, milestone, phase, member)                                                             | ✅     |
| 2.2  | DB        | `comm/projects.ts` tables (project, member, milestone, phase, status_history)                                                     | ✅     |
| 2.3  | Core      | Project services (CRUD, member management, milestone, status transitions)                                                         | ✅     |
| 2.4  | Core      | Project queries (list, detail, tasks, members, milestones, phases)                                                                | ✅     |
| 2.5  | Core      | Unit tests: `__vitest_test__/project.service.test.ts`                                                                             | ✅     |
| 2.6  | API       | `comm/projects.ts` routes (all commands + queries)                                                                                | ✅     |
| 2.7  | Worker    | 7 project event handlers (created, updated, status-changed, member-added, member-removed, milestone-created, milestone-completed) | ✅     |
| 2.8  | Web       | **Project list** (table with status badges, dates, owner)                                                                         | ✅     |
| 2.9  | Web       | **Project detail** (overview with tasks, header, nav)                                                                             | ✅     |
| 2.10 | Web       | **Project board** (reuses TaskBoardClient, scoped to project)                                                                     | ✅     |
| 2.11 | Web       | **Project timeline** (milestones, phases, task progress, completion %)                                                            | ✅     |
| 2.12 | Web       | **Project settings** (edit details, add/remove members, manage milestones, status transitions, archive)                           | ✅     |
| 2.13 | Gates     | `pnpm typecheck && pnpm test && pnpm check:all` — zero errors                                                                     | ✅     |

### Wave 3: Approvals ✅ COMPLETE

**Delivered:** March 13, 2026

| Step | Layer  | Work                                                                                            | Status |
| ---- | ------ | ----------------------------------------------------------------------------------------------- | ------ |
| 3.1  | Core   | Approval request/step/delegation/policy services and queries                                    | ✅     |
| 3.2  | API    | Approval command + query routes (`/v1/approvals`, pending, detail, policies, command endpoints) | ✅     |
| 3.3  | Worker | Approval handlers for request/approve/reject/delegate/escalate/SLA checks                       | ✅     |
| 3.4  | Web    | Queue, pending, detail, and policies pages                                                      | ✅     |
| 3.5  | Gates  | Validation via standard quality gate flow (`pnpm typecheck && pnpm test && pnpm check:all`)     | ✅     |

### Wave 4: Shared Infrastructure Activation ✅ COMPLETE

**Delivered:** March 12–13, 2026

| Step | Layer  | Work                                                                             | Status |
| ---- | ------ | -------------------------------------------------------------------------------- | ------ |
| 4.1  | Core   | Comment + label services/queries                                                 | ✅     |
| 4.2  | API    | Shared routes for comments + labels                                              | ✅     |
| 4.3  | Worker | Comment/label event handlers                                                     | ✅     |
| 4.4  | Web    | Task + project detail integration (`EntityCommentsClient`, `EntityLabelsClient`) | ✅     |
| 4.5  | Core   | Saved views service/query surface                                                | ✅     |
| 4.6  | API    | Saved view + subscription endpoints                                              | ✅     |
| 4.7  | Worker | Subscription change fan-out and mention-driven inbox dispatch                    | ✅     |
| 4.8  | Web    | Saved view persistence on tasks list + watch/unwatch controls                    | ✅     |

### Wave 5: Inbox Foundation ✅ COMPLETE

**Delivered:** March 12–13, 2026

| Step | Layer  | Work                                                                             | Status |
| ---- | ------ | -------------------------------------------------------------------------------- | ------ |
| 5.1  | Core   | Inbox service/query hardening and preference support                             | ✅     |
| 5.2  | API    | Inbox read/unread/list/mark-read/snooze/dismiss endpoints                        | ✅     |
| 5.3  | Worker | Unified dispatch path from tasks/projects/approvals/shared subscription events   | ✅     |
| 5.4  | Web    | `/comm/inbox`, `/comm/inbox/unread`, `/comm/inbox/preferences` with bulk actions | ✅     |
| 5.5  | Gates  | End-to-end verification and route/registry sync                                  | ✅     |

### Wave 6: Boardroom + Announcements

| Step | Layer       | Work                                                                      | Status                                                                                                   |
| ---- | ----------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 6.1  | Contracts   | `comm/boardroom/` schemas + `comm/announcements/` schemas                 | Done                                                                                                     |
| 6.2  | DB          | Boardroom + announcements tables                                          | Done                                                                                                     |
| 6.3  | Core        | Meeting lifecycle, agenda, attendees, resolutions+votes, minutes          | Partial (meeting, agenda, attendees, resolutions+votes done; minutes+action-items pending)               |
| 6.4  | Core        | Announcement publish engine, audience targeting, acknowledgement tracking | Done                                                                                                     |
| 6.5  | API         | Boardroom + announcements routes                                          | Done                                                                                                     |
| 6.6  | Worker      | Meeting/agenda/attendee/resolution handlers + announcement publish        | Partial (meeting, agenda-item, attendee, resolution-proposed done; minutes/action-item handlers pending) |
| 6.7  | Web         | Boardroom: meeting detail, agenda, attendees, resolutions+votes, minutes  | Partial (list/new/detail, agenda, attendees, resolutions+vote UI done; minutes+action-items UI pending)  |
| 6.8  | Web         | Announcements: feed, create, detail with acknowledgement tracking         | Done                                                                                                     |
| 6.9  | Integration | Resolution → auto-create task                                             | Pending                                                                                                  |

### Wave 7: Docs + Chatter + Workflows

| Step | Layer          | Work                                                                       | Status                                           |
| ---- | -------------- | -------------------------------------------------------------------------- | ------------------------------------------------ |
| 7.1  | Contracts + DB | `comm/docs/`, `comm/chatter/`, `comm/workflows/`                           | Partial (docs + chatter done; workflows pending) |
| 7.2  | Core           | Document service (CRUD, versioning, publish)                               | Done                                             |
| 7.3  | Core           | Chatter service (threads, messages, mentions)                              | Done                                             |
| 7.4  | Core           | Workflow engine (trigger evaluation, condition matching, action execution) | Pending                                          |
| 7.5  | API            | Docs + chatter + workflows routes                                          | Partial (docs + chatter done; workflows pending) |
| 7.6  | Worker         | Document published, chatter mention, workflow execution handlers           | Partial (document + chatter handlers done)       |
| 7.7  | Web            | Document explorer, editor, version history                                 | Done                                             |
| 7.8  | Web            | Chatter side panel (attached to any entity detail page)                    | Done                                             |
| 7.9  | Web            | Workflow builder (visual rule editor), execution log                       | Pending                                          |
| 7.10 | Integration    | Workflow triggers wired to all COMM + ERP outbox events                    | Pending                                          |

---

## 10. Next Development Proposal — Wave 4A-R then Wave 5 (March 14, 2026)

### Why This Sequence Next?

- Shared infra is already partially active; finishing saved views and subscriptions closes a known functional gap with low architecture risk.
- Inbox quality depends on clean subscription and mention event inputs; completing 4A-R first reduces inbox rework.
- This order preserves the proven thin-slice pattern: finish one bounded capability end-to-end before broadening module surface.

### Recommended Sprint Plan (4 days)

**Day 1 — Saved Views (Core + API + Tests)**

1. Implement saved-view service/query functions in `packages/core/src/comm/shared/`.
2. Add shared routes for save/list/update/delete view operations in `apps/api/src/routes/comm/shared.ts`.
3. Add focused tests for saved-view invariants (org scope, principal scope, default uniqueness).

**Day 2 — Subscriptions (Core + API + Worker)**

1. Implement subscribe/unsubscribe/list subscription operations in `packages/core/src/comm/shared/`.
2. Add subscription endpoints in `apps/api/src/routes/comm/shared.ts`.
3. Wire subscription events into worker dispatch path for inbox fan-out.

**Day 3 — Web Integration (Tasks First)**

1. Persist and restore saved views in `/comm/tasks` list (filters/sort/columns).
2. Add watch/unwatch controls in task detail to validate subscription UX.
3. Verify optimistic refresh and error handling against API envelope standards.

**Day 4 — Inbox Foundation Kickoff**

1. Harden inbox query contract and route handlers for unread, mark-read, snooze, dismiss.
2. Connect worker fan-out from tasks/projects/approvals/subscriptions.
3. Create `/comm/inbox` UI baseline with unread filter and bulk mark-read.

### Key Technical Decisions for Next Phase

| Decision               | Recommendation                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Saved view ownership   | Support principal-scoped and org-shared views with explicit permission gates                             |
| Default view semantics | Enforce one default per (`principalId`, `entityType`) in service rules                                   |
| Subscription fan-out   | Keep all notification side effects in worker path; API/core only emit canonical outbox events            |
| Mention handling       | Parse mentions in shared comment flows and route to inbox dispatch via existing worker envelope patterns |
| Rollout order          | Task list/task detail first, then project list/detail, then cross-module reuse                           |

### Acceptance Criteria

```
□ Saved views can be created, listed, updated, deleted, and restored on `/comm/tasks`
□ Exactly one default saved view per principal/entity pair is enforced
□ Users can watch/unwatch task and project entities
□ Subscription and mention events flow through worker to inbox dispatch
□ Inbox page shows unread items from tasks/projects/approvals/shared events
□ Route handlers remain thin and all business logic lives in core services
□ pnpm typecheck && pnpm test && pnpm check:all pass
```

---

## 11. Zero-Tech-Debt Implementation Protocol

This protocol is mandatory for all remaining `comm` slices.

### A. Preflight (Before Writing Code)

1. Confirm scope boundaries in one sentence.

- State exact capability and module touch points (for example: saved views for tasks list only).

2. Verify architecture direction before edits.

- Confirm import boundaries (`web -> contracts + ui`, `api -> contracts + core`, `core -> contracts + db`).
- Confirm pillar/module placement for every new file path.

3. Run baseline validation.

- `pnpm typecheck`
- `pnpm test`
- `pnpm check:all`

4. Freeze contract for the slice.

- Record request/response shape and error codes before UI wiring.

### B. Build (During Implementation)

1. Execute strict vertical order.

- contracts -> db -> migration -> core -> api -> worker -> web -> tests

2. Keep PR size constrained.

- One capability per PR.
- Avoid mixed feature and refactor changes.

3. Enforce mutation invariants.

- Every command includes idempotency key.
- Every mutation writes audit.
- Every mutation emits outbox event.

4. Enforce observability.

- Carry correlation id through command, outbox payload, and worker logs.

### C. Validation (Before Merge)

1. Run targeted checks on touched packages first.

- `pnpm --filter @afenda/core test`
- `pnpm --filter @afenda/api test`
- `pnpm --filter @afenda/web test`

2. Run full quality gates.

- `pnpm typecheck`
- `pnpm test`
- `pnpm check:all`

3. Verify async chain behavior for event-driven slices.

- Confirm command -> outbox -> worker -> downstream action path.

4. Verify no drift in registries.

- errors, permissions, audit actions, outbox event unions, route registry, OWNERS

### D. Merge Criteria (Non-Negotiable)

Do not merge if any condition below is true:

- Any gate is red.
- API route contains business logic that belongs in core.
- Mutation path misses audit or outbox emission.
- Import boundary or module-boundary rule is violated.
- Scope expanded beyond approved slice.

---

## 12. Quality Gates

### Per-Wave Checklist

```
□ All Zod schemas defined with proper types (bigint for money, timestamptz for dates)
□ All commands have idempotencyKey
□ All tables have org_id, created_at (tsz), updated_at (tsz), RLS, indexes
□ All services use withAudit() for mutations
□ All services emit outbox events
□ All services check permissions with hasPermission()
□ All queries use cursor pagination
□ Error codes registered in shared/errors.ts
□ Permissions registered in shared/permissions.ts
□ Audit actions registered in kernel/governance/audit/actions.ts
□ Unit tests in __vitest_test__/ directories
□ Web pages have loading.tsx and error.tsx
□ UI uses shadcn/ui components exclusively (no raw HTML)
□ No console.* — use Pino logger
□ No hardcoded colors — use Tailwind design tokens
□ No new Date() in DB code — use sql`now()`
□ OWNERS.md updated in each module
□ pnpm typecheck passes
□ pnpm test passes
□ pnpm check:all passes (all 18 CI gates)
```

### Testing Strategy

| Type                | Tool                    | Coverage                                                                    |
| ------------------- | ----------------------- | --------------------------------------------------------------------------- |
| Unit tests          | Vitest                  | Service logic, permission checks, status transitions, validation            |
| Org-isolation tests | Vitest                  | Cross-org query leakage prevention (template: `cross-org.test.template.ts`) |
| API tests           | Vitest + Fastify inject | Route validation, auth guards, rate limiting                                |
| E2E tests           | Playwright              | Auth → org select → comm task CRUD → inbox notification flow                |
| CI gates            | 18 gates                | Architecture enforcement (boundaries, shadcn, schema invariants)            |

---

## 13. UX Principles (Enterprise-Grade)

| Principle                          | Implementation                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| **Dense information architecture** | Tables with configurable columns, not cards. Inline editing where possible.          |
| **Keyboard-first execution**       | `Cmd+K` command palette, keyboard shortcuts for status transitions, `Tab` navigation |
| **Zero-loading-state flash**       | Suspense boundaries with skeleton loading states on every page                       |
| **Contextual actions**             | Right-click context menus, row-level actions, bulk action bar                        |
| **Deep linking**                   | Every entity has a shareable URL: `/comm/tasks/[id]`, `/comm/approvals/[id]`         |
| **Real-time feel**                 | `router.refresh()` after mutations, optimistic updates where safe                    |
| **Audit transparency**             | Activity feed panel on every entity showing immutable event history                  |
| **Accessibility**                  | WCAG 2.1 AA compliance, ARIA labels, focus management, screen reader support         |

---

## 14. Auth + Tenant Integration Addendum (Implementation Lock)

This section codifies required integration behavior between Neon auth and the `comm` pillar.

### API Client Contract

1. For all `/v1/comm/**` requests, inject `X-Org-Id` from trusted server-side active org context.
2. Missing org context must fail fast with `400/422` (or `401` when auth is invalid) and emit telemetry.
3. Do not silently downgrade requests to demo/default org behavior.

### App Shell Contract

1. `AppShellProvider` must source organizations from `listMyOrgs`.
2. Organization switch must call `setActiveOrg` and refresh data immediately.
3. Static/demo organization lists are forbidden in production paths.

### Selector and Onboarding Contract

1. `/auth/select-organization` must be idempotent.
2. Selector action must call `setActiveOrg` and redirect to callback.
3. Onboarding must create/join org and set active org before redirect.
4. Middleware must not block selector/onboarding flows.

### Required Telemetry Events

1. `signin_no_org`
2. `select_org_success`
3. `select_org_failure`
4. `api_missing_org_header`
5. `redirect_loop_detected`

### Dashboards and Alerts

Dashboards must include:

1. Sign-in outcomes segmented by tenant resolution branch (single org, multi org, zero org).
2. Protected-route redirect counts and loop incidents.
3. Missing org-header incidence on protected API endpoints.

Alert thresholds:

1. `redirect_loop_detected` > 5% of sign-ins in canary.
2. `api_missing_org_header` > 3% of protected API calls in canary.

---

## 15. Security and Data Integrity Safeguards

### Cookie and Session Controls

1. `active_org` cookie: `HttpOnly`, `Secure` in production, `SameSite=Strict` where route constraints allow.
2. Short TTL with refresh-on-activity strategy.
3. Server-side validation on every sensitive mutation.

### Authorization Controls

1. `setActiveOrg` rejects unauthorized org switches and logs audit events.
2. Membership validation is mandatory before writing tenant context.
3. Selector and onboarding endpoints are rate-limited.

### Audit Controls

Every action emits auditable events:

1. `setActiveOrg`
2. `create-org`
3. `select-org`

---

## 16. Rollout, Canary, and Rollback Criteria

### Rollout Plan

1. Internal rollout first.
2. Canary at 5% production traffic for 48–72 hours.
3. Full rollout only when error and loop metrics remain within limits.

### Pause or Rollback Triggers

1. Protected-route 5xx rate increases by more than 10%.
2. `redirect_loop_detected` exceeds 5% of sign-ins.
3. `api_missing_org_header` exceeds 3% of protected API calls.

### Rollback Actions

1. Disable tenant-routing feature flag.
2. Revert middleware behavior to prior stable mode.
3. Open incident and retain telemetry snapshot for postmortem.

---

## 17. Prioritized Delivery Order (Hotfix → Full Rollout)

### Hotfix (First Deploy)

1. Update `apps/web/proxy.ts` with narrow protected-route checks, exemptions, callback preservation, and loop detection.
2. Keep `apps/web/src/lib/api-client.ts` fail-fast for missing active org context (no demo fallback).
3. Align `apps/web/src/app/auth/_lib/auth-redirect.ts` post-signin resolver with explicit org resolution branches.

### Core Implementation

1. Implement tenant primitives in `apps/web/src/features/auth/server/afenda-auth.service.ts`.
2. Wire selector in `apps/web/src/app/auth/select-organization/page.tsx` with server action + idempotency.
3. Wire onboarding in `apps/web/src/app/auth/onboarding/page.tsx` with create/join + `setActiveOrg`.
4. Update `apps/web/src/components/AppShellProvider.tsx` to use dynamic org list and switch refresh.
5. Keep `apps/web/proxy.ts` and route-level guards aligned to avoid double redirects.

### Test Expansion

1. Unit tests for redirect resolver and `setActiveOrg` authorization.
2. Integration tests for middleware exemptions and org-header injection.
3. E2E for single-org, multi-org, no-org sign-in, org-switch, and unauthorized org switch attempts.

---

## 18. Quick Wins (Under One Day)

1. Add middleware exemption list + redirect loop detection in `proxy.ts`.
2. Verify all protected `comm` API calls fail fast when org header is missing.
3. Add missing telemetry wiring for `select_org_failure` and `redirect_loop_detected`.
4. Add/extend unit tests for redirect resolver branch coverage.

---

## Immediate Next Build Action

**Start Wave 1, Step 1.1:** Create `packages/contracts/src/comm/shared/` schemas (comment, label, saved-view, subscription) — the cross-cutting foundation that all comm modules depend on.
