# Phase 5 — Announcements: Execution Checklist

> **Status:** 🟡 NEXT — Ready to start  
> **Started:** —  
> **Target:** Org-wide broadcast with audience targeting, scheduling, and acknowledgement tracking  
> **Benchmark:** Slack announcements · Teams Posts · Notion announcements · Diligent board notices

---

## Overview

Announcements lets org admins publish or schedule org-wide (or team/role-scoped) notices.
Recipients see them in `/comm/announcements` and as inbox items.
Acknowledgement is tracked so publishers can confirm distribution.

**Reuse strategy:** shared `comm_comment` for replies, shared `commInboxItem` fan-out via worker, shared `subscriptions` model — no new notification path.

---

## Layer-by-Layer Checklist

### 1. Contracts (`packages/contracts/src/comm/announcements/`)

- [ ] Create `announcement.entity.ts`
  ```ts
  export const AnnouncementStatusValues = ["draft", "scheduled", "published", "archived"] as const;
  export const AnnouncementAudienceTypeValues = ["org", "team", "role"] as const;
  export const AnnouncementSchema = z.object({ ... });
  ```
- [ ] Create `announcement.commands.ts`
  - `CreateAnnouncementCommandSchema` — title, body, audienceType, audienceIds[], scheduledAt?
  - `PublishAnnouncementCommandSchema` — announcementId, idempotencyKey
  - `ScheduleAnnouncementCommandSchema` — announcementId, scheduledAt, idempotencyKey
  - `ArchiveAnnouncementCommandSchema` — announcementId, idempotencyKey
  - `AcknowledgeAnnouncementCommandSchema` — announcementId, idempotencyKey
- [ ] Create `announcement.events.ts` — event type constants:
  - `COMM_ANNOUNCEMENT_PUBLISHED = "COMM.ANNOUNCEMENT_PUBLISHED"`
  - `COMM_ANNOUNCEMENT_SCHEDULED = "COMM.ANNOUNCEMENT_SCHEDULED"`
  - `COMM_ANNOUNCEMENT_ACKNOWLEDGED = "COMM.ANNOUNCEMENT_ACKNOWLEDGED"`
  - `COMM_ANNOUNCEMENT_ARCHIVED = "COMM.ANNOUNCEMENT_ARCHIVED"`
- [ ] Create `index.ts` barrel exporting all schemas and types
- [ ] Add to `packages/contracts/src/comm/index.ts`:
  ```ts
  export * from "./announcements/index.js";
  ```
- [ ] Add error codes to `packages/contracts/src/shared/errors.ts`:
  - `COMM_ANNOUNCEMENT_NOT_FOUND`
  - `COMM_ANNOUNCEMENT_ALREADY_PUBLISHED`
  - `COMM_ANNOUNCEMENT_ALREADY_ARCHIVED`
  - `COMM_ANNOUNCEMENT_NOT_PUBLISHED` (for ack guard)
- [ ] Add audit actions to `packages/contracts/src/kernel/governance/audit/actions.ts`:
  - `"comm.announcement.created"`
  - `"comm.announcement.published"`
  - `"comm.announcement.scheduled"`
  - `"comm.announcement.archived"`
  - `"comm.announcement.acknowledged"`
- [ ] Add permissions to `packages/contracts/src/shared/permissions.ts`:
  - `comm.announcement.create`
  - `comm.announcement.publish`
  - `comm.announcement.schedule`
  - `comm.announcement.archive`
  - `comm.announcement.acknowledge`

**Gate:** `pnpm typecheck` must pass before proceeding.

---

### 2. DB Schema (`packages/db/src/schema/comm/`)

- [ ] Create `packages/db/src/schema/comm/announcements.ts`:

  ```ts
  export const commAnnouncementStatusEnum = pgEnum("comm_announcement_status", AnnouncementStatusValues);
  export const commAnnouncementAudienceTypeEnum = pgEnum("comm_announcement_audience_type", AnnouncementAudienceTypeValues);

  export const commAnnouncement = pgTable("comm_announcement", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: commAnnouncementStatusEnum("status").notNull().default("draft"),
    audienceType: commAnnouncementAudienceTypeEnum("audience_type").notNull(),
    audienceIds: jsonb("audience_ids").notNull().default([]),  // uuid[] as jsonb
    scheduledAt: tsz("scheduled_at"),
    publishedAt: tsz("published_at"),
    publishedByPrincipalId: uuid("published_by_principal_id").references(() => iamPrincipal.id),
    createdByPrincipalId: uuid("created_by_principal_id").notNull().references(() => iamPrincipal.id),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  }, (t) => [
    index("comm_announcement_org_status_idx").on(t.orgId, t.status),
    index("comm_announcement_org_published_idx").on(t.orgId, t.publishedAt),
    rlsOrg,
  ]);

  export const commAnnouncementRead = pgTable("comm_announcement_read", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    announcementId: uuid("announcement_id").notNull().references(() => commAnnouncement.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id").notNull().references(() => iamPrincipal.id),
    acknowledgedAt: tsz("acknowledged_at").defaultNow().notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
  }, (t) => [
    unique("comm_announcement_read_unique").on(t.orgId, t.announcementId, t.principalId),
    index("comm_announcement_read_ann_idx").on(t.announcementId),
    index("comm_announcement_read_principal_idx").on(t.principalId),
    rlsOrg,
  ]);
  ```

- [ ] Register new tables in `packages/db/src/schema/comm/index.ts`
- [ ] Register enums in `packages/db/src/schema/index.ts` if needed
- [ ] Run `pnpm db:generate` and review generated migration SQL
- [ ] Add RLS policies to migration file (USING org_id = current_setting('app.org_id')::uuid)
- [ ] Run `pnpm db:migrate`
- [ ] Export new tables from `packages/db/src/index.ts`

**Guard:** No `new Date()` in schema file — use `sql\`now()\``or`defaultNow()`.  
**Guard:** All timestamps are `timestamptz`.

---

### 3. Core Service (`packages/core/src/comm/announcements/`)

- [ ] Create `announcement.service.ts`:

  - `createAnnouncement(db, ctx, policyCtx, correlationId, params)` — insert draft, audit, outbox
  - `publishAnnouncement(db, ctx, policyCtx, correlationId, params)` — status guard (draft|scheduled only), set publishedAt = sql`now()`, audit, outbox `COMM_ANNOUNCEMENT_PUBLISHED`
  - `scheduleAnnouncement(db, ctx, policyCtx, correlationId, params)` — status guard (draft only), set scheduledAt, audit, outbox `COMM_ANNOUNCEMENT_SCHEDULED`
  - `archiveAnnouncement(db, ctx, policyCtx, correlationId, params)` — status guard (published only), audit, outbox `COMM_ANNOUNCEMENT_ARCHIVED`
  - `acknowledgeAnnouncement(db, ctx, policyCtx, correlationId, params)` — guard (published only), upsert `comm_announcement_read`, audit, outbox `COMM_ANNOUNCEMENT_ACKNOWLEDGED`
  - All commands: idempotency key check, permission check, withAudit

- [ ] Create `announcement.queries.ts`:

  - `listAnnouncements(db, orgId, params?)` — filterable by status, cursor-paginated
  - `getAnnouncementById(db, orgId, id)` — single row with null check
  - `listAnnouncementReads(db, orgId, announcementId)` — who acknowledged
  - `countUnacknowledgedForPrincipal(db, orgId, principalId)` — unread badge count

- [ ] Create `index.ts` barrel

- [ ] Export from `packages/core/src/comm/index.ts`:
  ```ts
  export * from "./announcements";
  ```

**Pattern to follow:** copy service structure from `packages/core/src/comm/approvals/` — same withAudit + outbox pattern.

---

### 4. API Routes (`apps/api/src/routes/comm/announcements.ts`)

- [ ] Create route file:
  ```
  GET  /v1/announcements              → listAnnouncements
  GET  /v1/announcements/:id          → getAnnouncementById (+ read count)
  POST /v1/commands/create-announcement
  POST /v1/commands/publish-announcement
  POST /v1/commands/schedule-announcement
  POST /v1/commands/archive-announcement
  POST /v1/commands/acknowledge-announcement
  GET  /v1/announcements/:id/reads    → listAnnouncementReads (publisher view)
  ```
- [ ] Register in `apps/api/src/index.ts` (alongside tasks/projects/approvals/shared)
- [ ] Schema: use Fastify + Zod type provider, follow pattern from `approvals.ts`
- [ ] Thin handlers: validate → call core → shape response

---

### 5. Worker Handlers (`apps/worker/src/jobs/comm/announcements/`)

- [ ] `handle-announcement-published.ts`

  - Receive `COMM.ANNOUNCEMENT_PUBLISHED` outbox event
  - Fetch audience principal IDs based on `audienceType` + `audienceIds` (org = all principals in org, team = team members, role = principals with role)
  - Fan out via `createInboxItems(helpers, dispatches)` from `../shared/inbox-fanout.ts`
  - Log count of dispatched items

- [ ] `handle-announcement-scheduled.ts`

  - Receive `COMM.ANNOUNCEMENT_SCHEDULED` outbox event
  - Enqueue a delayed job: `helpers.addJob("publish_scheduled_announcement", { announcementId }, { runAt: scheduledAt })`
  - Log schedule time

- [ ] `handle-announcement-acknowledged.ts`

  - Receive `COMM.ANNOUNCEMENT_ACKNOWLEDGED` outbox event
  - Log acknowledgement (analytics/audit hook for future dashboards)

- [ ] `handle-announcement-archived.ts`

  - Receive `COMM.ANNOUNCEMENT_ARCHIVED` outbox event
  - Log archive action

- [ ] Register all handlers in `apps/worker/src/index.ts`

---

### 6. Web UI (`apps/web/src/app/(comm)/announcements/`)

- [ ] `page.tsx` — list view (RSC):

  - Fetch `GET /v1/announcements?status=published`
  - Shows title, audience badge, published date, read/unread indicator
  - Empty state when no published announcements

- [ ] `loading.tsx` — skeleton cards

- [ ] `error.tsx` — retry button

- [ ] `[id]/page.tsx` — detail view (RSC):

  - Fetch announcement + read list
  - Full title + body (pre-wrap)
  - "Acknowledge" button (client action)
  - Read receipts count visible to publisher (future: expandable list)

- [ ] `[id]/loading.tsx` — detail skeleton

- [ ] `new/page.tsx` — draft form (RSC + client action):

  - Fields: title, body (textarea), audienceType (Select), scheduledAt? (date input)
  - Submit → POST /v1/commands/create-announcement
  - After create: redirect to `/comm/announcements`

- [ ] `_components/AnnouncementCard.tsx` — shared card component used in list
- [ ] `_components/AcknowledgeButton.tsx` — "use client" button that calls acknowledge command

- [ ] **Update `apps/web/src/lib/api-client.ts`** to add:

  - `fetchAnnouncements(params?)`
  - `fetchAnnouncement(id)`
  - `fetchAnnouncementReads(announcementId)`
  - `createAnnouncement(body)`
  - `publishAnnouncement(body)`
  - `scheduleAnnouncement(body)`
  - `archiveAnnouncement(body)`
  - `acknowledgeAnnouncement(body)`

- [ ] **Update inbox entity link map** in `InboxClient.tsx`:

  ```ts
  case "announcement":
    return `/comm/announcements/${item.entityId}`;
  ```

- [ ] **Update comm layout sidebar TODO** in `layout.tsx` to add Announcements nav link

---

### 7. Tests (`packages/core/src/comm/announcements/__vitest_test__/`)

- [ ] `announcement.service.test.ts`:
  - `createAnnouncement` — happy path + permission denial
  - `publishAnnouncement` — state guard (cannot publish already-published)
  - `scheduleAnnouncement` — sets scheduledAt correctly
  - `archiveAnnouncement` — state guard (cannot archive draft)
  - `acknowledgeAnnouncement` — idempotent (can ack twice without error)
  - Cross-org isolation: cannot operate on another org's announcement

---

### 8. Gate Verification

Run before marking Phase 5 complete:

```bash
pnpm typecheck
pnpm test
pnpm check:all
```

Check specifically:

- `node tools/gates/boundaries.mjs` — no new boundary violations
- `node tools/gates/domain-completeness.mjs` — error codes + audit actions + permissions registered
- `node tools/gates/route-registry-sync.mjs` — new announcement routes documented
- `node tools/gates/schema-invariants.mjs` — all tables have org_id + timestamptz
- `node tools/gates/shadcn-enforcement.mjs` — no raw HTML in new pages

---

## Exit Criteria

- [ ] Org admin can create an announcement (draft → publish or draft → schedule → auto-publish)
- [ ] All audience principals receive an inbox item (`entityType: "announcement"`)
- [ ] Recipient can view announcement at `/comm/announcements/:id` and click Acknowledge
- [ ] Publisher can see acknowledgement count on detail page
- [ ] `/comm/announcements` list shows published announcements with unread indicator
- [ ] Inbox `entityType: "announcement"` links correctly to `/comm/announcements/:id`
- [ ] All 8 CI gates pass

---

## Sequence Dependencies

```
contracts → db → migrate → core → api → worker → web → tests → gates
```

Do NOT skip steps. Do NOT implement web before API is tested.

---

## Key Files to Copy/Reference

| Reference                                              | Purpose                                           |
| ------------------------------------------------------ | ------------------------------------------------- |
| `packages/core/src/comm/approvals/approval.service.ts` | Multi-step service + withAudit + outbox pattern   |
| `apps/api/src/routes/comm/approvals.ts`                | Route file structure with typed Fastify           |
| `apps/worker/src/jobs/comm/shared/inbox-fanout.ts`     | `createInboxItems` + `listSubscriberPrincipalIds` |
| `apps/worker/src/jobs/comm/approvals/`                 | Worker handler registration pattern               |
| `apps/web/src/app/(comm)/approvals/`                   | List + detail + queue page pattern                |
