Good. Here is the **AFENDA HRM architecture map** in the form I would actually use to start implementation.

It is structured as:

1. **parent domain map**
2. **phase-by-phase scaffold**
3. **table groups**
4. **dependency order**
5. **what to build first in code**

This follows the rollout shape already implied in your HRM charter and domain design docs.  

## Implementation Note (2026-03-13)

Use active AFENDA architecture paths for all new implementation:

- `packages/contracts/src/erp/hr/`
- `packages/db/src/schema/erp/hrm/`
- `packages/core/src/erp/hr/`
- `apps/api/src/routes/erp/hr/`
- `apps/web/src/app/(erp)/hr/`

Legacy path examples in this document (`packages/domain`, `apps/api/src/modules`) are conceptual only and should not be used for new files.

---

# 1. AFENDA HRM Parent Domain Map

```text
HRM
├── 01. Core HR
│   ├── Person Master
│   ├── Employee Profile
│   ├── Employment Records
│   ├── Work Assignments
│   ├── Identity / Contact / Address
│   └── Lifecycle Status History
│
├── 02. Organizational Management
│   ├── Org Units
│   ├── Jobs
│   ├── Job Grades
│   ├── Positions
│   ├── Position Assignments
│   └── Reporting Lines / Headcount Control
│
├── 03. Recruitment
│   ├── Requisitions
│   ├── Candidates
│   ├── Applications
│   ├── Interviews
│   ├── Feedback
│   └── Offers
│
├── 04. Onboarding / Offboarding
│   ├── Onboarding Plans
│   ├── Onboarding Tasks
│   ├── Probation Reviews
│   ├── Separation Cases
│   └── Exit Clearance
│
├── 05. Time / Attendance / Leave
│   ├── Work Calendars
│   ├── Holidays
│   ├── Shifts / Rosters
│   ├── Attendance Records
│   ├── Timesheets
│   ├── Leave Types
│   ├── Leave Balances
│   └── Leave Requests
│
├── 06. Compensation & Benefits
│   ├── Pay Groups
│   ├── Compensation Packages
│   ├── Compensation Components
│   ├── Benefit Plans
│   ├── Benefit Enrollments
│   └── Salary Change History
│
├── 07. Payroll
│   ├── Payroll Periods
│   ├── Payroll Runs
│   ├── Payroll Run Employees
│   ├── Payroll Inputs
│   ├── Payroll Elements
│   ├── Payroll Result Lines
│   ├── Taxes / Contributions
│   ├── Payslips
│   ├── Payment Batches
│   └── GL Posting
│
├── 08. Performance Management
│   ├── Goal Cycles
│   ├── Goals
│   ├── Reviews
│   ├── Review Lines
│   └── Competency Assessments
│
├── 09. Talent Management
│   ├── Talent Profiles
│   ├── Succession Plans
│   ├── Successor Candidates
│   ├── Talent Review Sessions
│   └── Career Paths
│
├── 10. Learning & Development
│   ├── Courses
│   ├── Learning Paths
│   ├── Enrollments
│   ├── Certifications
│   ├── Skills
│   └── Development Plans
│
├── 11. Compliance & Employee Relations
│   ├── Policy Acknowledgements
│   ├── Grievance Cases
│   ├── Disciplinary Actions
│   ├── Work Permit / Statutory Tracking
│   └── HR Case Evidence
│
├── 12. ESS / MSS
│   ├── Employee Profile View
│   ├── Leave Self-Service
│   ├── Payslip Access
│   ├── Team Approvals
│   └── Manager Workforce Actions
│
└── 13. Workforce Planning
    ├── Workforce Plans
    ├── Headcount Plans
    ├── Hiring Forecasts
    └── Labor Cost Projections
```

That overall structure is consistent with the HRM full chapter and one-page charter.  

---

# 2. Recommended Scaffold Phases

## Phase 0 — Foundation

Build the technical spine only.

### Packages

```text
packages/domain/src/hrm/
packages/db/src/schema/hrm/
apps/api/src/modules/hrm/
apps/web/src/features/hrm/
```

### First schema files

```text
_shared.ts
index.ts
hrm-employees.ts
hrm-employment.ts
hrm-organization.ts
```

### First invariants

```text
- tenant isolation
- org scoping
- effective dating support
- audit + outbox on mutations
- idempotency key for commands
```

This matches your release contract: schema-is-truth, command/query split, withAudit, outbox, strict multi-tenant isolation. 

---

## Phase 1 — Core Workforce Engine

This is the first real business wave.

### Modules

```text
core-hr
organizational-management
recruitment
onboarding-offboarding
```

### Why first

Because every later HR action depends on:

* who the worker is
* what employment they hold
* where they sit in the org
* whether they are active / transferred / terminated

### Tables

```text
hrm_persons
hrm_person_identities
hrm_person_addresses
hrm_person_contacts
hrm_employee_profiles
hrm_employment_records
hrm_employment_contracts
hrm_work_assignments
hrm_employment_status_history
hrm_org_units
hrm_jobs
hrm_job_grades
hrm_positions
hrm_position_assignments
hrm_job_requisitions
hrm_candidates
hrm_candidate_applications
hrm_interviews
hrm_interview_feedback
hrm_offers
hrm_onboarding_plans
hrm_onboarding_tasks
hrm_probation_reviews
hrm_separation_cases
hrm_exit_clearance_items
```

These entities are directly reflected in the uploaded schema plan. 

---

## Phase 2 — Workforce Operations

This is where HRM becomes operational.

### Modules

```text
time-attendance
leave-management
ess
mss
```

### Tables

```text
hrm_work_calendars
hrm_holidays
hrm_shift_patterns
hrm_roster_assignments
hrm_attendance_records
hrm_timesheet_entries
hrm_leave_types
hrm_leave_balances
hrm_leave_requests
```

### Outcome

Now AFENDA can support:

* daily attendance truth
* leave approval
* manager approvals
* time-based payroll inputs

This is also listed as essential first-rollout spine in the charter. 

---

## Phase 3 — Payroll & Compensation

This should come only after Phase 1 and 2 are stable.

### Modules

```text
compensation-benefits
payroll
```

### Tables

```text
hrm_pay_groups
hrm_compensation_packages
hrm_compensation_components
hrm_benefit_plans
hrm_benefit_enrollments
hrm_salary_change_history

hrm_payroll_calendars
hrm_payroll_periods
hrm_payroll_runs
hrm_payroll_run_employees
hrm_payroll_inputs
hrm_payroll_elements
hrm_payroll_result_lines
hrm_payroll_taxes
hrm_payroll_statutory_contributions
hrm_payslips
hrm_payroll_payment_batches
hrm_payroll_payment_lines
hrm_payroll_gl_postings
hrm_payroll_gl_posting_lines
hrm_payroll_exceptions
```

### Why later

Because payroll is only correct if these are already governed:

* active employment
* effective assignment
* pay group mapping
* leave and attendance inputs
* approval chain
* legal entity and cost center

Your domain chapter explicitly treats payroll as the most financially sensitive HR sub-module. 

---

## Phase 4 — Talent & Capability

Strategic HR.

### Modules

```text
performance-management
talent-management
learning-development
workforce-planning
```

### Tables

```text
hrm_goal_cycles
hrm_goals
hrm_performance_reviews
hrm_performance_review_lines
hrm_competency_models
hrm_competency_assessments

hrm_talent_profiles
hrm_succession_plans
hrm_successor_candidates
hrm_talent_review_sessions
hrm_talent_review_entries
hrm_career_paths

hrm_courses
hrm_learning_paths
hrm_learning_enrollments
hrm_certifications
hrm_skills
hrm_development_plans

hrm_workforce_plans
hrm_headcount_plans
hrm_labor_cost_projections
```

---

## Phase 5 — Enterprise Extensions

This is the enterprise hardening layer.

### Modules

```text
employee-relations
hr-compliance
claims-and-reimbursement
hr-helpdesk
health-safety-welfare
```

### Tables

```text
hrm_policy_acknowledgements
hrm_grievance_cases
hrm_disciplinary_actions
hrm_compliance_checks
hrm_work_permit_records
hrm_hr_case_evidence
hrm_claims
hrm_reimbursements
hrm_hr_cases
hrm_incident_reports
```

---

# 3. Dependency Order

This is the part that matters most.

```text
PERSON
  ↓
EMPLOYEE PROFILE
  ↓
EMPLOYMENT RECORD
  ↓
WORK ASSIGNMENT
  ↓
ORG UNIT / JOB / POSITION
  ↓
ATTENDANCE / LEAVE / TIMESHEET
  ↓
COMPENSATION PACKAGE
  ↓
PAYROLL INPUTS
  ↓
PAYROLL RUN
  ↓
PAYSLIP / PAYMENT / GL POSTING
```

And for strategic HR:

```text
EMPLOYMENT + POSITION + HISTORY
  ↓
PERFORMANCE
  ↓
TALENT
  ↓
LEARNING
  ↓
WORKFORCE PLANNING
```

So the order is not arbitrary.
It is a **truth dependency chain**.

That fits your broader AFENDA principle of building the machine of truth, not random features.

---

# 4. Exact File Scaffold I Would Start With

## Database

```text
packages/db/src/schema/hrm/
  _shared.ts
  hrm-employees.ts
  hrm-employment.ts
  hrm-organization.ts
  hrm-recruitment.ts
  hrm-onboarding.ts
  hrm-attendance.ts
  hrm-leave.ts
  hrm-compensation.ts
  hrm-payroll.ts
  hrm-performance.ts
  hrm-talent.ts
  hrm-learning.ts
  hrm-compliance.ts
  index.ts
```

That file layout is aligned with the uploaded design recommendation. 

## Domain services

```text
packages/domain/src/hrm/
  core/
  organization/
  recruitment/
  onboarding/
  attendance/
  leave/
  compensation/
  payroll/
  performance/
  talent/
  learning/
  compliance/
```

## API routes

```text
apps/api/src/modules/hrm/
  core-hr/
  organization/
  recruitment/
  onboarding/
  attendance/
  leave/
  payroll/
  compensation/
```

## Web app

```text
apps/web/src/features/hrm/
  people/
  organization/
  recruitment/
  onboarding/
  attendance/
  leave/
  payroll/
  talent/
  learning/
```

---

# 5. My Recommended Initial Build Waves for You

Given AFENDA is finance-first, I would do this:

## Wave A

```text
hrm-employees
hrm-employment
hrm-organization
```

## Wave B

```text
hrm-recruitment
hrm-onboarding
hrm-attendance
hrm-leave
```

## Wave C

```text
hrm-compensation
hrm-payroll
finance integration
treasury payment export
```

## Wave D

```text
hrm-performance
hrm-talent
hrm-learning
workforce planning
```

## Wave E

```text
compliance
employee relations
helpdesk
claims
health & safety
```

This is basically the same as your charter’s R1–R5 release motion, just made more implementation-ready. 

---

# 6. The Minimum Viable AFENDA HRM Spine

If you want the smallest serious starting point, build only these first:

```text
hrm_persons
hrm_employee_profiles
hrm_employment_records
hrm_work_assignments
hrm_org_units
hrm_jobs
hrm_job_grades
hrm_positions
hrm_leave_requests
hrm_attendance_records
hrm_compensation_packages
hrm_payroll_runs
hrm_payroll_run_employees
hrm_payroll_result_lines
hrm_payroll_gl_postings
```

That is enough to create:

* workforce truth
* org truth
* operational inputs
* payroll result truth
* finance handoff

---

# 7. Best Starting Point Tomorrow Morning

If I were scaffolding this in your repo, I would start with exactly this sequence:

```text
1. _shared.ts
2. hrm-employees.ts
3. hrm-employment.ts
4. hrm-organization.ts
5. hrm index export
6. domain types + enums
7. Core HR command services
8. Core HR query services
9. API routes for hire / transfer / terminate
10. seed data for org units / jobs / grades / positions
```

That gives you a stable base before any payroll work starts.

Next, I can turn this into a **real AFENDA repo scaffold** with exact file paths, like:

* `packages/db/src/schema/hrm/_shared.ts`
* `packages/domain/src/hrm/core/services/hire-employee.service.ts`
* `apps/api/src/modules/hrm/core-hr/routes/create-employee.ts`
* `apps/web/src/features/hrm/people/...`

and lay it out as **Phase 1 implementation scaffold**.
