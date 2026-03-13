# Phase 2: Projects Module — Implementation Specification

**Status:** In Progress — backend complete, primary web views live  
**Planned Duration:** 5-7 days  
**Prerequisites:** Phase 1 Tasks (✅ complete)  
**Target Date:** March 13, 2026

---

## Overview

The **Projects** module provides enterprise project management with containers for task organization, team membership, milestone tracking, and phase-based workflow. It serves as the organizational parent for the Tasks module.

**Implementation Snapshot (March 13, 2026):**

- ✅ Contracts, DB schema, core services, API routes, and worker handlers are implemented
- ✅ Web list, detail, creation, board, timeline, and settings views are implemented
- ✅ Project-scoped task retrieval is implemented via `/v1/projects/:id/tasks`
- ✅ Auth and landing console errors were removed for stable smoke e2e execution
- ⏳ Remaining UI depth includes member lookup UX and richer timeline write interactions

**Scope:**

- Project creation, updates, archiving
- Multi-level membership (owner, editor, viewer)
- Milestone and phase management
- Task list filtering by project
- Board and timeline views

---

## 1. Database Schema

### Core Tables

#### `project` (append immutable fields, UPDATE-friendly)

```sql
CREATE TABLE project (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,

  project_number text NOT NULL,  -- auto-gen "PRJ-001", "PRJ-002"
  name text NOT NULL,              -- max 200 chars
  description text,                -- nullable, rich text
  status text NOT NULL,             -- enum: planning, active, on_hold, completed, cancelled, archived
  visibility text NOT NULL,         -- enum: org, team, private (default: org)

  owner_id uuid NOT NULL,           -- principal FK
  start_date date,                  -- nullable
  target_date date,                 -- nullable
  completed_at timestamptz,         -- when status → completed

  color text,                       -- hex color "#FF5733", for UI identification

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_org_number UNIQUE (org_id, project_number),
  CONSTRAINT project_owner_fk FOREIGN KEY (owner_id) REFERENCES principal(id)
);

CREATE INDEX project_org_id_idx ON project(org_id);
CREATE INDEX project_status_idx ON project(status);
CREATE INDEX project_owner_id_idx ON project(owner_id);
```

#### `project_member` (many-to-many with roles)

```sql
CREATE TABLE project_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  principal_id uuid NOT NULL,

  role text NOT NULL,  -- enum: owner, editor, viewer
  joined_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_member_org_project_member UNIQUE (org_id, project_id, principal_id),
  CONSTRAINT project_member_project_fk FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
  CONSTRAINT project_member_principal_fk FOREIGN KEY (principal_id) REFERENCES principal(id) ON DELETE CASCADE
);

CREATE INDEX project_member_project_id_idx ON project_member(project_id);
CREATE INDEX project_member_principal_id_idx ON project_member(principal_id);
```

#### `project_milestone`

```sql
CREATE TABLE project_milestone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,

  milestone_number text NOT NULL,  -- "PRJ-001-M1", "PRJ-001-M2"
  name text NOT NULL,              -- max 200 chars
  description text,                -- nullable
  status text NOT NULL,            -- enum: planned, on_track, at_risk, completed, cancelled

  target_date date NOT NULL,
  completed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_milestone_org_project UNIQUE (org_id, project_id, milestone_number),
  CONSTRAINT project_milestone_project_fk FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
);

CREATE INDEX project_milestone_project_id_idx ON project_milestone(project_id);
CREATE INDEX project_milestone_status_idx ON project_milestone(status);
```

#### `project_phase`

```sql
CREATE TABLE project_phase (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,

  name text NOT NULL,              -- e.g., "Planning", "Design", "Build", "Test", "Deploy"
  description text,                -- nullable
  sequence_order integer NOT NULL, -- 1, 2, 3, ... for ordering

  start_date date,
  target_end_date date,
  actual_end_date timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_phase_org_project_order UNIQUE (org_id, project_id, sequence_order),
  CONSTRAINT project_phase_project_fk FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
);

CREATE INDEX project_phase_project_id_idx ON project_phase(project_id);
```

#### `project_status_history` (append-only audit trail)

```sql
CREATE TABLE project_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,

  from_status text NOT NULL,
  to_status text NOT NULL,

  changed_by_principal_id uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text,  -- nullable, why status changed

  CONSTRAINT project_status_history_project_fk FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
);

CREATE INDEX project_status_history_project_id_idx ON project_status_history(project_id);
```

---

## 2. Zod Schemas

**Location:** `packages/contracts/src/comm/projects/`

### File Structure

```
packages/contracts/src/comm/projects/
├── index.ts                    (barrel export)
├── project.entity.ts           (entity schemas)
├── project.commands.ts         (command schemas)
├── project-member.entity.ts    (membership schemas)
└── project-milestone.entity.ts (milestone schemas)
```

### project.entity.ts

```typescript
export const ProjectStatusValues = [
  "planning", "active", "on_hold", "completed", "cancelled", "archived"
] as const;

export const ProjectVisibilityValues = ["org", "team", "private"] as const;

export const ProjectStatusSchema = z.enum(ProjectStatusValues);
export const ProjectVisibilitySchema = z.enum(ProjectVisibilityValues);

export const ProjectSchema = z.object({
  id: CommProjectIdSchema,
  orgId: OrgIdSchema,
  projectNumber: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  status: ProjectStatusSchema,
  visibility: ProjectVisibilitySchema,
  ownerId: PrincipalIdSchema,
  startDate: DateSchema.nullable().optional(),
  targetDate: DateSchema.nullable().optional(),
  completedAt: UtcDateTimeSchema.nullable().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable().optional(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type Project = z.infer<typeof ProjectSchema>;
```

### project.commands.ts

```typescript
export const CreateProjectCommandSchema = z.object({
  idempotencyKey: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  visibility: ProjectVisibilitySchema.default("org"),
  startDate: DateSchema.nullable().optional(),
  targetDate: DateSchema.nullable().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable().optional(),
});

export const UpdateProjectCommandSchema = z.object({
  idempotencyKey: z.string().uuid(),
  projectId: CommProjectIdSchema,
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  visibility: ProjectVisibilitySchema.optional(),
  startDate: DateSchema.nullable().optional(),
  targetDate: DateSchema.nullable().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable().optional(),
});

export const TransitionProjectStatusCommandSchema = z.object({
  idempotencyKey: z.string().uuid(),
  projectId: CommProjectIdSchema,
  toStatus: ProjectStatusSchema,
  reason: z.string().optional(),
});

export const AddProjectMemberCommandSchema = z.object({
  idempotencyKey: z.string().uuid(),
  projectId: CommProjectIdSchema,
  principalId: PrincipalIdSchema,
  role: z.enum(["owner", "editor", "viewer"]),
});

export const CreateMilestoneCommandSchema = z.object({
  idempotencyKey: z.string().uuid(),
  projectId: CommProjectIdSchema,
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  targetDate: DateSchema,
});

export type CreateProjectCommand = z.infer<typeof CreateProjectCommandSchema>;
export type UpdateProjectCommand = z.infer<typeof UpdateProjectCommandSchema>;
export type TransitionProjectStatusCommand = z.infer<typeof TransitionProjectStatusCommandSchema>;
export type AddProjectMemberCommand = z.infer<typeof AddProjectMemberCommandSchema>;
export type CreateMilestoneCommand = z.infer<typeof CreateMilestoneCommandSchema>;
```

---

## 3. Core Service Layer

**Location:** `packages/core/src/comm/projects/`

### Services to Implement

1. **`project.service.ts`**

   - `createProject(db, ctx, cmd)` → Project
   - `updateProject(db, ctx, cmd)` → Project
   - `getProject(db, ctx, projectId)` → Project
   - `listProjects(db, ctx, filters)` → Project[]
   - `transitionProjectStatus(db, ctx, cmd)` → Project
   - `archiveProject(db, ctx, projectId)` → Project

2. **`project-member.service.ts`**

   - `addProjectMember(db, ctx, cmd)` → ProjectMember
   - `removeProjectMember(db, ctx, projectId, principalId)`
   - `updateMemberRole(db, ctx, projectId, principalId, role)`
   - `listProjectMembers(db, ctx, projectId)` → ProjectMember[]

3. **`project-milestone.service.ts`**
   - `createMilestone(db, ctx, cmd)` → Milestone
   - `completeMilestone(db, ctx, milestoneId)` → Milestone
   - `listMilestones(db, ctx, projectId)` → Milestone[]

### Key Patterns

**Multi-Tenant Isolation:**

```typescript
export async function createProject(
  db: Db,
  ctx: Context,
  cmd: CreateProjectCommand
): Promise<Result<Project>> {
  return withOrgContext(db, {
    orgId: ctx.activeContext.orgId,
    principalId: ctx.principalId,
  }, async (tx) => {
    // All queries in this block run in transaction with org isolation
    const project = await tx.insert(projectTable).values({
      orgId: ctx.activeContext.orgId,
      projectNumber: await generateProjectNumber(tx, ctx.activeContext.orgId),
      ...cmd,
    }).returning();

    // Emit outbox event
    await emitOutboxEvent(tx, {
      aggregateId: project[0].id,
      aggregateType: "project",
      eventType: "COMM.PROJECT_CREATED",
      payload: project[0],
      correlationId: ctx.correlationId,
    });

    // Audit log
    await writeAuditLog(tx, ctx, {
      action: "comm.project.created",
      entityType: "project",
      entityId: project[0].id,
      details: { name: project[0].name },
    });

    return { ok: true, data: project[0] };
  });
}
```

---

## 4. API Routes

**Location:** `apps/api/src/routes/comm/projects/`

### Endpoints

```typescript
// List projects
GET /v1/projects?status=active&limit=20&cursor=xxx

// Get project detail
GET /v1/projects/:id

// Get project tasks
GET /v1/projects/:id/tasks?status=open&limit=20

// Get project milestones
GET /v1/projects/:id/milestones

// Create project
POST /v1/commands/create-project
Body: { idempotencyKey, name, description?, visibility?, startDate?, targetDate?, color? }

// Update project
POST /v1/commands/update-project
Body: { idempotencyKey, projectId, name?, description?, visibility?, startDate?, targetDate?, color? }

// Transition status
POST /v1/commands/transition-project-status
Body: { idempotencyKey, projectId, toStatus, reason? }

// Add member
POST /v1/commands/add-project-member
Body: { idempotencyKey, projectId, principalId, role }

// Remove member
POST /v1/commands/remove-project-member
Body: { idempotencyKey, projectId, principalId }

// Create milestone
POST /v1/commands/create-milestone
Body: { idempotencyKey, projectId, name, description?, targetDate }

// Complete milestone
POST /v1/commands/complete-milestone
Body: { idempotencyKey, milestoneId }
```

---

## 5. Web UI Pages

**Location:** `apps/web/src/app/(comm)/projects/`

### Pages to Build

1. **`/comm/projects`** — Project list

   - Filterable table (status, visibility, owner)
   - Create project button
   - Cursor pagination
   - Status badges, owner names, target dates

2. **`/comm/projects/[id]`** — Project detail

   - Header: name, status, owner, dates, color
   - Tabs: Overview | Members | Milestones | Tasks | Board
   - Overview: description, stats (task count, milestone progress)
   - Members: list with role management
   - Milestones: ordered list, complete/edit actions
   - Tasks: filtered list of tasks in this project

3. **`/comm/projects/[id]/board`** — Kanban board

   - Columns by task status
   - Cards for tasks in project
   - Drag-and-drop to change status
   - Filter by assignee, priority, milestone

4. **`/comm/projects/[id]/timeline`** — Gantt chart

   - Milestones on timeline
   - Task bars by start/due dates
   - Phase swimlanes
   - Scroll/zoom controls

5. **`/comm/projects/[id]/settings`** — Project settings

   - Edit name, description, dates, visibility
   - Archive/delete project
   - Danger zone

6. **`/comm/projects/new`** — Create project form
   - Name, description, visibility
   - Optional: start date, target date, color
   - Submit creates and redirects to detail

---

## 6. Worker Handlers

**Location:** `apps/worker/src/jobs/comm/projects/`

### Event Handlers

1. **`on-project-created.handler.ts`**

   - Add project owner as initial member (role: owner)
   - Send welcome notification
   - Log telemetry

2. **`on-project-member-added.handler.ts`**

   - Send "you've been added to project" notification
   - Subscribe user to project updates

3. **`on-project-status-changed.handler.ts`**

   - Notify members of status change
   - Update related tasks if project completed/archived

4. **`on-milestone-completed.handler.ts`**
   - Send milestone celebration message
   - Check if all milestones complete → auto-complete project

---

## 7. Testing Strategy

**Test Files:** `__vitest_test__/` directories

### Unit Tests

- `project.service.test.ts` — CRUD operations, status transitions, permissions
- `project-member.service.test.ts` — Adding/removing members, role validation
- `project-milestone.service.test.ts` — Milestone creation and completion

### Integration Tests

- API routes with full request/response cycle
- Multi-tenant isolation (org_id scoping)
- Audit log generation
- Outbox event emission

### Test Cases

```
✓ Create project with required fields only
✓ Create project with all optional fields
✓ Cannot create project without org context
✓ Project number auto-generates sequentially
✓ Update project fields
✓ Cannot update project from different org
✓ Transition status with audit reason
✓ Cannot transition to invalid status
✓ Add member to project
✓ Remove member from project
✓ Cannot add member outside org
✓ Create milestone
✓ List milestones ordered by target date
✓ Complete milestone
✓ Archive project (soft delete)
✓ Emit correct audit log and outbox events
```

---

## 8. Implementation Checklist

- [ ] **Database**

  - [ ] Create migration files
  - [ ] Verify schema (constraints, indexes)
  - [ ] Test multi-tenant isolation

- [ ] **Contracts (Zod)**

  - [ ] Define entity schemas
  - [ ] Define command schemas
  - [ ] Export from index.ts
  - [ ] Add to error codes registry
  - [ ] Add to audit actions registry

- [ ] **Core Services**

  - [ ] Implement project service
  - [ ] Implement member service
  - [ ] Implement milestone service
  - [ ] Add permission checks
  - [ ] Emit audit logs
  - [ ] Emit outbox events

- [ ] **API Routes**

  - [ ] Implement all endpoints
  - [ ] Add request validation (Zod)
  - [ ] Add response serialization
  - [ ] Test idempotency keys
  - [ ] Add rate limiting

- [ ] **Web Pages**

  - [ ] Project list page + filters
  - [ ] Project detail page
  - [ ] Project board view
  - [ ] Project timeline view
  - [ ] Project settings page
  - [ ] Create project form
  - [ ] Edit project modal
  - [ ] Add member dialog

- [ ] **Worker Handlers**

  - [ ] On-project-created handler
  - [ ] On-member-added handler
  - [ ] On-status-changed handler
  - [ ] On-milestone-completed handler

- [ ] **Tests**

  - [ ] Unit tests for services
  - [ ] Integration tests for API
  - [ ] UI component tests
  - [ ] Multi-tenant isolation tests

- [ ] **Documentation**

  - [ ] Update OWNERS.md files
  - [ ] Add JSDoc comments
  - [ ] Update README if needed

- [ ] **Quality Assurance**
  - [ ] Full typecheck pass
  - [ ] All tests green
  - [ ] Lint pass
  - [ ] All CI gates pass

---

## Dependencies & Order of Work

```
Day 1-2: Schema + Contracts
  ↓
Day 2-3: Core Services
  ↓
Day 3-4: API Routes + Tests
  ↓
Day 4-5: Web Pages
  ↓
Day 5-6: Worker Handlers
  ↓
Day 6-7: QA + Polish
```

---

## Success Criteria

✅ Zero TypeScript errors  
✅ All tests passing  
✅ Multi-tenant isolation verified  
✅ Idempotency enforced  
✅ Audit trail complete  
✅ UI responsive and intuitive  
✅ All CI gates passing  
✅ Ready for Phase 3 (Approvals)
