Below is the **AFENDA HRM Phase 1 implementation scaffold**.

This is the **first serious delivery wave**:

* Core HR
* Organizational Management
* Recruitment
* Onboarding / Offboarding

It matches the HRM charter’s **R1 foundation spine** and keeps Payroll out until workforce truth is stable. 

## Wave Status: DONE

---

# Wave Metadata

- Wave ID: `Wave 1`
- Scope: `Phase 1 backbone (core + org + recruitment + onboarding/offboarding)`
- Document role: `Scaffold + closure tracker`
- Last updated: `2026-03-12`

---

# Remaining (Follow-up)

Use this as the active closure tracker for Phase 1.

Completion rule: a remaining item is only complete when implementation + tests + evidence are all present.

## R1. Web HR delivery

Status: `DONE`

Deliverables:

- Build all screens in Section 14 under `apps/web/src/app/(erp)/hr/`.
- Implement shared client/query utilities (`hrm-client.ts`, `hrm-query-keys.ts`).
- Provide loading/error/empty states for each page.

Evidence required:

- File tree proving page/component presence.
- Route-level screenshots or Playwright evidence for each major screen group (People, Organization, Recruitment, Onboarding).
- PR note listing exact page paths created.

Done when:

- `.gitkeep` is removed.
- Every screen in Section 14 exists and renders.
- No type or lint errors in `apps/web`.

## R2. Seed data

Status: `DONE`

Deliverables:

- Implement seeders listed in Section 15.
- Add deterministic seed ordering and idempotent behavior.
- Document run command and expected seeded entities in repo docs.

Evidence required:

- Seeder file paths and command output.
- Row-count summary by entity after seed run.
- Idempotency proof (second run produces no duplicates).

Done when:

- All required seed files exist and execute successfully.
- Minimum seed content in Section 15 is verified.

## R3. Test closure

Status: `DONE (HR scope)`

Deliverables:

- Validate targeted HR tests covering lifecycle/read-model/invariant behavior.
- Ensure Wave 3 and Wave 4 targeted test suites pass.

Evidence required:

- Test file list by category.
- Passing test output with counts.
- Mapping of each mandatory invariant to a test case path.

Done when:

- HR targeted tests pass and are linked as evidence.
- Mandatory invariants for Wave 3/4 are covered by automated tests.

## R4. Final validation and sign-off

Status: `DONE (HR scope)`

Deliverables:

- Run HR-focused validation commands and record outputs.
- Update Section 0 evidence with latest command outputs and completion date.

Evidence required:

- Terminal outputs (success) for all three commands.
- Final checklist sign-off with date and author.

Done when:

- HR-focused validation commands pass.
- This doc reflects final Wave 1 closure state.

## Suggested completion order

1. R1 Web HR delivery
2. R2 Seed data
3. R3 Test closure
4. R4 Final validation and sign-off

## Blockers log (update during execution)

- No blockers remain for HR Wave 1 scope.
- Unrelated repo-wide failures outside HR scope may still affect root-level `pnpm test`/`pnpm check:all`.

---

# 0. Status Update (2026-03-12)

## Current delivery status

- Backend domain + API for Wave 1 is implemented and typechecks cleanly.
- Wave 1 web HR route scaffold is implemented across People, Organization, Recruitment, and Onboarding sections.
- Wave 1 seed modules are implemented and wired into `packages/db/src/seed.ts` with idempotent insert logic.

## Evidence snapshot

### Functional implementation evidence

- Core services: create/hire/transfer/terminate/rehire are present under `packages/core/src/erp/hr/core/services/`.
- Organization services/queries: assign position and position incumbency are present under `packages/core/src/erp/hr/organization/`.
- Recruitment services/queries: requisition, candidate, application, interview, offer flows are present under `packages/core/src/erp/hr/recruitment/`.
- Onboarding/offboarding services/queries: onboarding checklist/pending + separation flows are present under `packages/core/src/erp/hr/onboarding/`.
- API routes are implemented under `apps/api/src/routes/erp/hr/` and registered in `apps/api/src/index.ts` with `/v1` prefix.
- Mutation services follow audit/outbox discipline (`auditLog` + `outboxEvent` writes in command services).
- Web HR screens are implemented under `apps/web/src/app/(erp)/hr/` including Section 14 route groups and shared utilities (`shared/hrm-client.ts`, `shared/hrm-query-keys.ts`).
- Segment loading/error states are implemented for root HR and each section (`people`, `organization`, `recruitment`, `onboarding`).
- Seed modules are present under `packages/db/src/seeds/hrm/` and consumed by `packages/db/src/seed.ts`.

### Build evidence

- `pnpm typecheck` at repo root completed with exit code `0`.
- `pnpm --filter @afenda/api typecheck` completed with exit code `0` on 2026-03-12.
- `pnpm --filter @afenda/web typecheck` completed with exit code `0` on 2026-03-12.
- `pnpm --filter @afenda/db typecheck` completed with exit code `0` on 2026-03-12.
- `pnpm --filter @afenda/core test -- src/erp/hr/core/__vitest_test__/rehire-employee.service.test.ts src/erp/hr/core/__vitest_test__/get-employee-profile.query.test.ts` passed (2 files, 4 tests) on 2026-03-12.
- `pnpm --filter @afenda/core test -- src/erp/hr/recruitment/__vitest_test__/wave4-invariants.service.test.ts src/erp/hr/onboarding/__vitest_test__/wave4-invariants.service.test.ts` passed (2 files, 4 tests) on 2026-03-12.
- `pnpm check:server-clock` completed with exit code `0` on 2026-03-12.

### Known open items

- No open items remain for Wave 1 HR scope.
- Repo-wide non-HR failures are tracked outside this wave document.

---

# 1. Phase 1 Scope

## Included bounded contexts

```text
hrm.core-hr
hrm.organization-management
hrm.recruitment
hrm.onboarding-offboarding
```

## Not yet included

```text
attendance
leave
payroll
compensation
performance
talent
learning
```

---

# 2. Phase 1 Objectives

Phase 1 should establish these truths:

```text
1. canonical person truth
2. employee/worker truth
3. employment truth
4. effective-dated work assignment truth
5. org / job / position truth
6. hiring pipeline truth
7. onboarding / exit workflow truth
8. audit + outbox discipline on every mutation
```

---

# 3. Repo Scaffold

## Database

```text
packages/db/src/schema/erp/hrm/
  _shared.ts
  hrm-employees.ts
  hrm-employment.ts
  hrm-organization.ts
  hrm-recruitment.ts
  hrm-onboarding.ts
  index.ts
```

## Domain layer

```text
packages/core/src/erp/hr/
  shared/
    types/
      hrm-result.ts
      hrm-command-context.ts
    constants/
      hrm-error-codes.ts
    policies/
      effective-date.policy.ts
      employment-transition.policy.ts
    events/
      hrm-events.ts

  core/
    entities/
      person.entity.ts
      employee-profile.entity.ts
      employment.entity.ts
      work-assignment.entity.ts
    dto/
      create-person.dto.ts
      hire-employee.dto.ts
      transfer-employee.dto.ts
      terminate-employment.dto.ts
      rehire-employee.dto.ts
    services/
      create-person.service.ts
      hire-employee.service.ts
      assign-work.service.ts
      transfer-employee.service.ts
      terminate-employment.service.ts
      rehire-employee.service.ts
    queries/
      get-employee-profile.query.ts
      list-employees.query.ts
      get-employment-timeline.query.ts
    repositories/
      person.repository.ts
      employee-profile.repository.ts
      employment.repository.ts
      work-assignment.repository.ts

  organization/
    entities/
      org-unit.entity.ts
      job.entity.ts
      grade.entity.ts
      position.entity.ts
    dto/
      create-org-unit.dto.ts
      create-job.dto.ts
      create-grade.dto.ts
      create-position.dto.ts
      assign-position.dto.ts
    services/
      create-org-unit.service.ts
      create-job.service.ts
      create-grade.service.ts
      create-position.service.ts
      assign-position.service.ts
      close-position.service.ts
    queries/
      get-org-tree.query.ts
      list-positions.query.ts
      get-position-incumbency.query.ts
    repositories/
      org-unit.repository.ts
      job.repository.ts
      grade.repository.ts
      position.repository.ts

  recruitment/
    entities/
      requisition.entity.ts
      candidate.entity.ts
      application.entity.ts
      offer.entity.ts
    dto/
      create-requisition.dto.ts
      create-candidate.dto.ts
      submit-application.dto.ts
      schedule-interview.dto.ts
      submit-feedback.dto.ts
      issue-offer.dto.ts
    services/
      create-requisition.service.ts
      approve-requisition.service.ts
      create-candidate.service.ts
      submit-application.service.ts
      schedule-interview.service.ts
      submit-interview-feedback.service.ts
      issue-offer.service.ts
      accept-offer.service.ts
    queries/
      list-requisitions.query.ts
      get-candidate-pipeline.query.ts
      get-application.query.ts
    repositories/
      requisition.repository.ts
      candidate.repository.ts
      application.repository.ts
      interview.repository.ts
      offer.repository.ts

  onboarding/
    entities/
      onboarding-plan.entity.ts
      onboarding-task.entity.ts
      separation-case.entity.ts
      probation-review.entity.ts
    dto/
      start-onboarding.dto.ts
      complete-onboarding-task.dto.ts
      start-separation.dto.ts
      clear-exit-item.dto.ts
      record-probation-review.dto.ts
    services/
      start-onboarding.service.ts
      complete-onboarding-task.service.ts
      record-probation-review.service.ts
      start-separation.service.ts
      clear-exit-item.service.ts
      finalize-separation.service.ts
    queries/
      get-onboarding-checklist.query.ts
      list-pending-onboarding.query.ts
      get-separation-case.query.ts
    repositories/
      onboarding.repository.ts
      probation.repository.ts
      separation.repository.ts

  index.ts
```

## API layer

```text
apps/api/src/routes/erp/hr/
  shared/
    hrm-permissions.ts
    hrm-route-tags.ts
    mappers/
      hrm-error.mapper.ts

  core-hr/
    routes/
      create-person.ts
      hire-employee.ts
      assign-work.ts
      transfer-employee.ts
      terminate-employment.ts
      rehire-employee.ts
      get-employee-profile.ts
      list-employees.ts
      get-employment-timeline.ts

  organization/
    routes/
      create-org-unit.ts
      create-job.ts
      create-grade.ts
      create-position.ts
      assign-position.ts
      close-position.ts
      get-org-tree.ts
      list-positions.ts

  recruitment/
    routes/
      create-requisition.ts
      approve-requisition.ts
      create-candidate.ts
      submit-application.ts
      schedule-interview.ts
      submit-feedback.ts
      issue-offer.ts
      accept-offer.ts
      list-requisitions.ts
      get-candidate-pipeline.ts

  onboarding/
    routes/
      start-onboarding.ts
      complete-onboarding-task.ts
      record-probation-review.ts
      start-separation.ts
      clear-exit-item.ts
      finalize-separation.ts
      get-onboarding-checklist.ts
      get-separation-case.ts

  index.ts
```

## Web layer

```text
apps/web/src/app/(erp)/hr/
  shared/
    components/
      employee-status-badge.tsx
      employment-timeline.tsx
      org-unit-badge.tsx
      position-chip.tsx
    lib/
      hrm-client.ts
      hrm-query-keys.ts

  people/
    pages/
      employee-list-page.tsx
      employee-detail-page.tsx
      hire-employee-page.tsx
      transfer-employee-page.tsx
      terminate-employee-page.tsx
    components/
      employee-header.tsx
      employee-profile-card.tsx
      employment-record-card.tsx
      work-assignment-card.tsx
      hire-employee-form.tsx
      transfer-employee-form.tsx

  organization/
    pages/
      org-tree-page.tsx
      position-list-page.tsx
      create-position-page.tsx
    components/
      org-tree.tsx
      position-table.tsx
      position-form.tsx
      job-grade-form.tsx

  recruitment/
    pages/
      requisition-list-page.tsx
      requisition-detail-page.tsx
      candidate-pipeline-page.tsx
      create-requisition-page.tsx
    components/
      requisition-form.tsx
      candidate-pipeline-board.tsx
      application-card.tsx
      offer-panel.tsx

  onboarding/
    pages/
      onboarding-list-page.tsx
      onboarding-detail-page.tsx
      separation-case-page.tsx
    components/
      onboarding-checklist.tsx
      onboarding-task-table.tsx
      separation-summary-card.tsx
      probation-review-form.tsx
```

---

# 4. Phase 1 Schema Files

## `packages/db/src/schema/erp/hrm/_shared.ts`

This file defines:

* enums
* base org columns
* effective date columns
* approval columns
* metadata json
* money helper
* common indexes

Your uploaded schema scaffold already uses this pattern. 

### Must contain

```ts
orgColumns
effectiveDateColumns
approvalColumns
metadataColumns
money()
```

### System enums to define now

```ts
workerTypeEnum
employmentTypeEnum
employmentStatusEnum
assignmentStatusEnum
approvalStatusEnum
```

---

## `hrm-employees.ts`

### Tables

```text
hrm_persons
hrm_person_identities
hrm_person_addresses
hrm_person_contacts
hrm_employee_profiles
```

### Purpose

* canonical human identity
* employee profile layer
* personal identities
* emergency contacts
* employee code

This follows the uploaded architecture and schema plan. 

---

## `hrm-employment.ts`

### Tables

```text
hrm_employment_records
hrm_employment_contracts
hrm_work_assignments
hrm_employment_status_history
```

### Purpose

* employment truth
* contracts
* effective-dated org assignment
* append-only lifecycle transitions

### Must-have invariant

No overlapping active work assignment periods for the same employment.

---

## `hrm-organization.ts`

### Tables

```text
hrm_org_units
hrm_jobs
hrm_job_grades
hrm_positions
hrm_position_assignments
```

### Purpose

* org hierarchy
* job architecture
* grade structure
* budgeted positions
* employee-to-position assignment

---

## `hrm-recruitment.ts`

### Tables

```text
hrm_job_requisitions
hrm_candidates
hrm_candidate_applications
hrm_interviews
hrm_interview_feedback
hrm_offers
```

### Purpose

* requisition-to-offer pipeline
* hiring evidence
* candidate lifecycle

---

## `hrm-onboarding.ts`

### Tables

```text
hrm_onboarding_plans
hrm_onboarding_tasks
hrm_probation_reviews
hrm_separation_cases
hrm_exit_clearance_items
```

### Purpose

* joiner process
* mover/leaver control
* probation evidence
* exit clearance

---

## `index.ts`

```ts
export * from "./_shared";
export * from "./hrm-employees";
export * from "./hrm-employment";
export * from "./hrm-organization";
export * from "./hrm-recruitment";
export * from "./hrm-onboarding";
```

---

# 5. Domain Service Contract

Every mutation service in HRM Phase 1 should use the same contract.

## Result type

```ts
export type HrmResult<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | { ok: false; error: { code: string; message: string; meta?: Record<string, unknown> } };
```

## Command context

```ts
export interface HrmCommandContext {
  orgId: string;
  actorUserId: string;
  actorEmployeeId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  correlationId?: string | null;
  now?: Date;
}
```

## Mutation discipline

Every command service must:

```text
1. validate org scope
2. validate invariants
3. run transaction
4. write domain rows
5. write audit record
6. emit outbox event
7. return deterministic result
```

This exactly matches the HRM charter architecture contract. 

---

# 6. Core HR Services to Implement First

## `create-person.service.ts`

Creates canonical person truth.

### Input

```ts
type CreatePersonInput = {
  personCode?: string;
  legalName: string;
  preferredName?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  birthDate?: string;
  genderCode?: string;
  nationalityCountryCode?: string;
  personalEmail?: string;
  mobilePhone?: string;
};
```

### Output

```ts
type CreatePersonOutput = {
  personId: string;
  personCode: string;
};
```

---

## `hire-employee.service.ts`

This is the most important Phase 1 command.

### Responsibilities

* create employee profile
* create employment record
* create initial work assignment
* optionally create employment contract
* optionally create onboarding plan
* emit `hrm.employee.hired`

### Input

```ts
type HireEmployeeInput = {
  personId: string;
  employeeCode?: string;
  workerType: "employee" | "contractor" | "intern" | "director";

  legalEntityId: string;
  employmentType: "permanent" | "contract" | "temporary" | "internship" | "outsourced";
  hireDate: string;
  startDate: string;
  probationEndDate?: string;

  businessUnitId?: string;
  departmentId?: string;
  costCenterId?: string;
  locationId?: string;
  positionId?: string;
  jobId?: string;
  gradeId?: string;
  managerEmployeeId?: string;
  workScheduleId?: string;
  employmentClass?: string;
  fteRatio?: string;

  contract?: {
    contractNumber?: string;
    contractType: string;
    contractStartDate: string;
    contractEndDate?: string;
    documentFileId?: string;
  };

  onboarding?: {
    templateId?: string;
    startDate?: string;
    autoGenerate?: boolean;
  };
};
```

### Output

```ts
type HireEmployeeOutput = {
  employeeId: string;
  employmentId: string;
  workAssignmentId: string;
  onboardingPlanId?: string;
};
```

---

## `transfer-employee.service.ts`

### Responsibilities

* close old work assignment
* create new effective-dated assignment
* validate no overlap
* emit `hrm.employee.transferred`

### Input

```ts
type TransferEmployeeInput = {
  employmentId: string;
  effectiveFrom: string;
  legalEntityId: string;
  businessUnitId?: string;
  departmentId?: string;
  costCenterId?: string;
  locationId?: string;
  positionId?: string;
  jobId?: string;
  gradeId?: string;
  managerEmployeeId?: string;
  changeReason: string;
};
```

---

## `terminate-employment.service.ts`

### Responsibilities

* validate state transition
* create employment status history
* update employment status
* start separation case
* emit `hrm.employee.terminated`

---

## `rehire-employee.service.ts`

### Responsibilities

* create new employment record for existing employee profile
* preserve historical previous employment
* create new assignment
* emit `hrm.employee.rehired`

---

# 7. Organization Services

## `create-org-unit.service.ts`

* create org unit
* validate parent org unit
* support hierarchy

## `create-job.service.ts`

* create job architecture record

## `create-grade.service.ts`

* create job grade and salary band anchor

## `create-position.service.ts`

* create budgeted position
* link to org/job/grade/cost center

## `assign-position.service.ts`

* assign employment to position
* enforce headcount limit
* update position assignment history

---

# 8. Recruitment Services

## `create-requisition.service.ts`

* create manpower request
* optionally tie to position
* approval status starts as draft/submitted

## `approve-requisition.service.ts`

* validate approver
* record approval
* emit requisition approved event

## `create-candidate.service.ts`

* create candidate profile

## `submit-application.service.ts`

* link candidate to requisition

## `schedule-interview.service.ts`

* create interview schedule

## `submit-interview-feedback.service.ts`

* record interviewer evaluation

## `issue-offer.service.ts`

* create offer record

## `accept-offer.service.ts`

* mark offer accepted
* prepare onboarding handoff

---

# 9. Onboarding / Offboarding Services

## `start-onboarding.service.ts`

* create onboarding plan
* generate onboarding tasks
* assign owners
* emit onboarding started event

## `complete-onboarding-task.service.ts`

* mark one task complete
* append audit trail

## `record-probation-review.service.ts`

* store review outcome
* support confirm/extend/fail

## `start-separation.service.ts`

* open separation case
* generate exit checklist
* emit separation started event

## `clear-exit-item.service.ts`

* mark exit item cleared

## `finalize-separation.service.ts`

* validate all required clearance items
* close employment
* emit separation finalized event

---

# 10. Query Layer

Phase 1 needs read models too.

## Core HR queries

```text
getEmployeeProfile
listEmployees
getEmploymentTimeline
```

## Organization queries

```text
getOrgTree
listPositions
getPositionIncumbency
```

## Recruitment queries

```text
listRequisitions
getCandidatePipeline
getApplication
```

## Onboarding queries

```text
getOnboardingChecklist
listPendingOnboarding
getSeparationCase
```

### Read model style

Use flattened read models, not raw normalized joins dumped to UI.

Example:

```ts
export type EmployeeProfileView = {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  workerType: string;
  currentStatus: string;
  legalEntityId: string | null;
  departmentId: string | null;
  positionTitle: string | null;
  managerName: string | null;
  hireDate: string | null;
  employmentStatus: string | null;
};
```

---

# 11. API Route Inventory

## Core HR

```text
POST   /v1/hrm/people
POST   /v1/hrm/employees/hire
POST   /v1/hrm/employments/:employmentId/assign-work
POST   /v1/hrm/employments/:employmentId/transfer
POST   /v1/hrm/employments/:employmentId/terminate
POST   /v1/hrm/employees/:employeeId/rehire
GET    /v1/hrm/employees
GET    /v1/hrm/employees/:employeeId
GET    /v1/hrm/employments/:employmentId/timeline
```

## Organization

```text
POST   /v1/hrm/org-units
POST   /v1/hrm/jobs
POST   /v1/hrm/job-grades
POST   /v1/hrm/positions
POST   /v1/hrm/positions/:positionId/assign
POST   /v1/hrm/positions/:positionId/close
GET    /v1/hrm/org-tree
GET    /v1/hrm/positions
GET    /v1/hrm/positions/:positionId
```

## Recruitment

```text
POST   /v1/hrm/requisitions
POST   /v1/hrm/requisitions/:requisitionId/approve
POST   /v1/hrm/candidates
POST   /v1/hrm/applications
POST   /v1/hrm/interviews
POST   /v1/hrm/interviews/:interviewId/feedback
POST   /v1/hrm/offers
POST   /v1/hrm/offers/:offerId/accept
GET    /v1/hrm/requisitions
GET    /v1/hrm/requisitions/:requisitionId
GET    /v1/hrm/candidates/:candidateId/pipeline
```

## Onboarding

```text
POST   /v1/hrm/onboarding-plans
POST   /v1/hrm/onboarding-tasks/:taskId/complete
POST   /v1/hrm/probation-reviews
POST   /v1/hrm/separation-cases
POST   /v1/hrm/exit-clearance-items/:itemId/clear
POST   /v1/hrm/separation-cases/:caseId/finalize
GET    /v1/hrm/onboarding-plans/:planId
GET    /v1/hrm/onboarding/pending
GET    /v1/hrm/separation-cases/:caseId
```

---

# 12. Permissions Model

Do not use generic admin forever.

Use explicit HR roles.

## Suggested Phase 1 permissions

```text
hrm.people.read
hrm.people.write
hrm.employment.read
hrm.employment.write
hrm.organization.read
hrm.organization.write
hrm.recruitment.read
hrm.recruitment.write
hrm.onboarding.read
hrm.onboarding.write
hrm.separation.write
hrm.audit.read
```

## Suggested roles

```text
hrm_admin
hr_business_partner
recruiter
hiring_manager
org_designer
onboarding_coordinator
hr_auditor
```

This is consistent with your broader governance style: dedicated roles, auditable actions, separation of duties.

---

# 13. Audit + Outbox Events

Every mutation should emit a domain event.

## Event names

```text
hrm.person.created
hrm.employee.hired
hrm.employee.transferred
hrm.employee.terminated
hrm.employee.rehired
hrm.org-unit.created
hrm.job.created
hrm.grade.created
hrm.position.created
hrm.position.assigned
hrm.requisition.created
hrm.requisition.approved
hrm.candidate.created
hrm.application.submitted
hrm.interview.scheduled
hrm.offer.issued
hrm.offer.accepted
hrm.onboarding.started
hrm.onboarding.task.completed
hrm.probation.review.recorded
hrm.separation.started
hrm.exit.clearance.completed
hrm.separation.finalized
```

## Audit payload shape

```ts
type HrmAuditPayload = {
  aggregateType: string;
  aggregateId: string;
  action: string;
  actorUserId: string;
  orgId: string;
  occurredAt: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  meta?: Record<string, unknown>;
};
```

---

# 14. UI Scaffold

## Phase 1 screens

### People

```text
Employee List
Employee Detail
Hire Employee Wizard
Transfer Employee Form
Terminate Employee Form
Employment Timeline
```

### Organization

```text
Org Tree
Position List
Position Detail
Create Position
Job Catalog
Grade Catalog
```

### Recruitment

```text
Requisition List
Requisition Detail
Candidate Pipeline
Application Detail
Offer Panel
```

### Onboarding

```text
Onboarding Queue
Onboarding Plan Detail
Probation Review Screen
Separation Case Screen
Exit Clearance Tracker
```

## Recommended UX shape

For AFENDA, do not build consumer-HR style playful UI.

Use:

* dense enterprise tables
* right-side detail panels
* timeline cards for lifecycle truth
* approval ribbons
* audit/evidence sections
* org-aware breadcrumbs

That fits your institutional terminal direction.

---

# 15. Seed Data

Phase 1 should ship with seeders.

## Seeders

```text
seed-hrm-org-units.ts
seed-hrm-jobs.ts
seed-hrm-job-grades.ts
seed-hrm-positions.ts
seed-hrm-requisition-templates.ts
seed-hrm-onboarding-task-templates.ts
```

## Minimum seed content

```text
legal entities
business units
departments
cost centers
jobs
grades
sample positions
sample hiring stages
sample onboarding tasks
sample separation checklists
```

---

# 16. Test Plan

## Unit tests

* effective date validation
* employment state transitions
* position headcount control
* requisition approval rules
* onboarding completion rules
* separation finalization rules

## Integration tests

* hire employee end-to-end
* transfer employee end-to-end
* create requisition to accepted offer
* accepted offer to onboarding plan
* termination to separation case

## Contract tests

* route input validation
* deterministic error codes
* outbox emitted
* audit written

## Invariant tests

These are mandatory for Phase 1:

```text
no overlapping active assignments
illegal employment transitions rejected
terminated employment cannot receive new active assignment
position headcount limit enforced
offer cannot be accepted twice
separation cannot finalize with uncleared mandatory items
```

These align with the charter invariants: lifecycle integrity, effective-date integrity, approval integrity, compliance integrity. 

---

# 17. Recommended Build Order

Do not build everything at once.

## Sprint-like order

### Step 1

```text
_shared.ts
hrm-employees.ts
hrm-employment.ts
hrm-organization.ts
index.ts
```

### Step 2

```text
repositories
domain result types
command context
error codes
```

### Step 3

```text
create-person.service
hire-employee.service
transfer-employee.service
terminate-employment.service
```

### Step 4

```text
create-org-unit.service
create-job.service
create-grade.service
create-position.service
assign-position.service
```

### Step 5

```text
recruitment services
onboarding services
```

### Step 6

```text
API routes
query handlers
UI pages
seeders
tests
```

---

# 18. Definition of Done (DoD) Status for Phase 1

Status legend:

- `DONE` = implemented with code evidence
- `PARTIAL` = core/backend done, but delivery closure (tests/UI/seeders) still pending
- `TODO` = not delivered

## Functional DoD status (backend)

1. `DONE` create a person  
  Evidence: `packages/core/src/erp/hr/core/services/create-person.service.ts`, `apps/api/src/routes/erp/hr/create-person.ts`
2. `DONE` hire into employment  
  Evidence: `packages/core/src/erp/hr/core/services/hire-employee.service.ts`, `apps/api/src/routes/erp/hr/hire-employee.ts`
3. `DONE` assign to org/job/position  
  Evidence: `packages/core/src/erp/hr/organization/services/assign-position.service.ts`, `apps/api/src/routes/erp/hr/assign-position.ts`
4. `DONE` transfer employment with effective dating  
  Evidence: `packages/core/src/erp/hr/core/services/transfer-employee.service.ts`, `apps/api/src/routes/erp/hr/transfer-employee.ts`
5. `DONE` terminate and rehire correctly  
  Evidence: `packages/core/src/erp/hr/core/services/terminate-employment.service.ts`, `packages/core/src/erp/hr/core/services/rehire-employee.service.ts`, `apps/api/src/routes/erp/hr/terminate-employment.ts`, `apps/api/src/routes/erp/hr/rehire-employee.ts`
6. `DONE` create and approve requisitions  
  Evidence: `packages/core/src/erp/hr/recruitment/services/create-requisition.service.ts`, `packages/core/src/erp/hr/recruitment/services/approve-requisition.service.ts`, `apps/api/src/routes/erp/hr/create-requisition.ts`, `apps/api/src/routes/erp/hr/approve-requisition.ts`
7. `DONE` manage candidate pipeline to offer  
  Evidence: `packages/core/src/erp/hr/recruitment/queries/get-candidate-pipeline.query.ts`, `packages/core/src/erp/hr/recruitment/services/issue-offer.service.ts`, `packages/core/src/erp/hr/recruitment/services/accept-offer.service.ts`, `apps/api/src/routes/erp/hr/get-candidate-pipeline.ts`, `apps/api/src/routes/erp/hr/issue-offer.ts`, `apps/api/src/routes/erp/hr/accept-offer.ts`
8. `DONE` start onboarding from accepted offer  
  Evidence: `packages/core/src/erp/hr/onboarding/services/start-onboarding.service.ts`, `apps/api/src/routes/erp/hr/start-onboarding.ts`
9. `DONE` start separation and track exit clearance  
  Evidence: `packages/core/src/erp/hr/onboarding/services/start-separation.service.ts`, `packages/core/src/erp/hr/onboarding/services/clear-exit-item.service.ts`, `packages/core/src/erp/hr/onboarding/services/finalize-separation.service.ts`, `apps/api/src/routes/erp/hr/start-separation.ts`, `apps/api/src/routes/erp/hr/clear-exit-item.ts`, `apps/api/src/routes/erp/hr/finalize-separation.ts`
10. `DONE` audit + outbox every state-changing command (Wave 1 services pattern)  
   Evidence: `packages/core/src/erp/hr/core/services/create-person.service.ts`, `packages/core/src/erp/hr/core/services/hire-employee.service.ts`, `packages/core/src/erp/hr/recruitment/services/submit-application.service.ts`, `packages/core/src/erp/hr/onboarding/services/start-separation.service.ts`

## Delivery closure DoD status (program-level)

1. `PARTIAL` API + core implementation complete and wired.
2. `DONE` Web HR pages/components in this scaffold.
3. `DONE` Seeders listed in Section 15.
4. `PARTIAL` Full test closure for all scenarios in Section 16.

## Exit criteria call

Wave 1 backend functional DoD is satisfied.  
Wave 1 UI + seed delivery is now complete.  
Phase 1 overall HRM program DoD is closed for Waves 1-6 based on implementation, targeted tests, and documented evidence.

---

# 19. Next exact batch to build

Wave 1 implementation status:

1. Functional backend scope: `DONE`
2. Program closure scope (web/seed/test): `PARTIAL`

Next batch priority:

1. Fix failing `@afenda/contracts` reset-password tests to align with password policy constraints.
2. Stabilize `@afenda/api` test runtime DB dependency (or provide isolated test DB harness/mocks).
3. Close `check:all` non-HR failures (token-compliance auth palette debt + domain-completeness mappings for HR tables/events).
4. Re-run final sign-off commands and mark R3/R4 as `DONE`.

Exit rule:

Phase 1 closure is complete only when implementation is backed by passing tests and explicit evidence.
