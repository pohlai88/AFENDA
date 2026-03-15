Excellent. Here is a **full ERP-grade HRM domain architecture** using the same enterprise domain thinking as AFENDA.

# AFENDA HRM Domain Architecture

## 1. Domain Mission

**HRM** is the enterprise domain responsible for managing:

* workforce truth
* employment lifecycle
* labor cost
* payroll execution
* talent capability
* learning growth
* workforce compliance
* manager and employee services

This domain should not behave like a simple employee directory.

It should behave like a **Workforce Truth Engine**:

* every worker has a governed master record
* every employment change is traceable
* every payroll impact is auditable
* every talent decision has evidence
* every learning record becomes capability history

---

# 2. HRM Domain Scope

## Parent Domain

`hrm`

## Recommended bounded contexts

```text
hrm
├── core-hr
├── organizational-management
├── recruitment
├── onboarding-offboarding
├── time-attendance
├── leave-management
├── payroll
├── compensation-benefits
├── performance-management
├── talent-management
├── learning-development
├── workforce-planning
├── employee-relations
├── hr-compliance
├── employee-self-service
└── manager-self-service
```

---

# 3. Domain Breakdown

## A. Core HR

This is the canonical workforce master.

**Purpose**
Manage employee identity, employment relationship, legal assignment, and status.

**Owns**

* employee master
* employment records
* contract records
* statutory identity
* work location
* department assignment
* supervisor assignment
* lifecycle state

**Key entities**

* Employee
* Employment
* EmploymentContract
* PersonIdentity
* EmployeeAddress
* EmergencyContact
* Dependent
* WorkAssignment
* EmployeeDocument

**Key workflows**

* create worker
* hire worker
* transfer worker
* promote worker
* change employment terms
* suspend worker
* terminate worker
* rehire worker

---

## B. Organizational Management

This models how the enterprise workforce is structured.

**Purpose**
Represent org structure, positions, reporting lines, and headcount control.

**Owns**

* company hierarchy
* business units
* departments
* teams
* positions
* reporting structure
* matrix assignments
* approved headcount

**Key entities**

* OrgUnit
* Position
* PositionAssignment
* ReportingLine
* JobProfile
* JobGrade
* CostCenterHRLink
* HeadcountPlan

**Key workflows**

* create org unit
* open position
* assign incumbent
* change supervisor chain
* freeze position
* close position

---

## C. Recruitment

Pre-hire pipeline.

**Purpose**
Manage requisition-to-offer process.

**Owns**

* manpower request
* requisition approval
* candidate pipeline
* interview stages
* offers
* pre-hire checks

**Key entities**

* JobRequisition
* Candidate
* Application
* InterviewSchedule
* InterviewFeedback
* OfferLetter
* HiringDecision

**Key workflows**

* request headcount
* approve requisition
* post vacancy
* shortlist candidate
* interview candidate
* issue offer
* handoff to onboarding

---

## D. Onboarding & Offboarding

Joiner / mover / leaver orchestration.

**Purpose**
Operationalize controlled workforce entry and exit.

**Owns**

* onboarding checklist
* document collection
* provisioning requests
* probation tracking
* separation workflow
* exit clearance
* final settlement handoff

**Key entities**

* OnboardingPlan
* OnboardingTask
* EmployeeAcknowledgement
* ProbationReview
* SeparationRequest
* ExitChecklist
* ClearanceItem

**Key workflows**

* initiate onboarding
* collect statutory documents
* trigger IT provisioning
* confirm day-1 readiness
* start exit case
* complete clearance
* pass final data to payroll

---

## E. Time, Attendance & Leave

Operational work time management.

**Purpose**
Capture attendance truth and leave obligations.

**Owns**

* shifts
* rosters
* attendance records
* timesheets
* overtime
* leave balances
* leave requests
* holiday calendars

**Key entities**

* WorkCalendar
* ShiftPattern
* RosterAssignment
* AttendanceRecord
* TimesheetEntry
* OvertimeRequest
* LeaveType
* LeaveBalance
* LeaveRequest
* HolidayCalendar

**Key workflows**

* assign shift
* import attendance
* approve overtime
* calculate leave accrual
* request leave
* approve leave
* flag attendance anomaly
* handoff payroll inputs

---

## F. Payroll

The most financially sensitive HR sub-module.

**Purpose**
Convert workforce compensation rules and time inputs into payable payroll results.

**Owns**

* payroll periods
* payroll calendars
* pay groups
* employee pay assignments
* earnings and deductions
* gross-to-net calculation
* statutory contributions
* tax calculation
* payslips
* payment instructions
* payroll posting

**Key entities**

* PayrollCalendar
* PayrollPeriod
* PayrollRun
* PayrollEmployeeRun
* PayrollElement
* PayrollInput
* EarningDefinition
* DeductionDefinition
* TaxRule
* StatutoryContributionRule
* Payslip
* PayrollPaymentInstruction
* PayrollJournal

**Key workflows**

* open payroll period
* collect payroll inputs
* compute gross pay
* compute deductions
* compute statutory items
* compute net pay
* validate exceptions
* approve payroll
* publish payslips
* generate bank file
* post to GL

---

## G. Compensation & Benefits

Strategic pay and benefits governance.

**Purpose**
Control salary structure, rewards, and non-payroll benefit programs.

**Owns**

* salary bands
* job grade compensation
* allowance framework
* benefit plans
* insurance
* annual review cycles
* incentive plans

**Key entities**

* CompensationStructure
* SalaryBand
* EmployeeCompensation
* BenefitPlan
* BenefitEnrollment
* AllowancePolicy
* BonusPlan

**Key workflows**

* assign compensation package
* revise salary
* enroll benefits
* process annual increments
* align comp to grade policy

---

## H. Performance Management

Formal performance governance.

**Purpose**
Track goals, review cycles, and outcomes.

**Owns**

* goals
* review cycles
* competency evaluations
* self review
* manager review
* calibration
* performance ratings

**Key entities**

* GoalPlan
* Goal
* ReviewCycle
* PerformanceReview
* CompetencyAssessment
* Feedback360
* RatingModel

**Key workflows**

* open goal cycle
* submit self review
* complete manager review
* calibrate ratings
* finalize performance result
* link to development plan

---

## I. Talent Management

Broader than performance; focused on future workforce quality.

**Purpose**
Manage succession, mobility, potential, readiness, and retention risk.

**Owns**

* talent pools
* succession plans
* career paths
* high-potential tracking
* readiness matrix
* internal mobility
* talent review boards

**Key entities**

* TalentProfile
* TalentPool
* SuccessionPlan
* SuccessorNomination
* CareerPath
* PotentialAssessment
* RetentionRiskAssessment
* MobilityPreference

**Key workflows**

* nominate successor
* run 9-box review
* identify HiPo employees
* assess bench strength
* plan promotion readiness
* map internal mobility paths

---

## J. Learning & Development

Capability-building engine.

**Purpose**
Manage learning content, training execution, skills, and certifications.

**Owns**

* course catalog
* training programs
* learning paths
* enrollments
* attendance
* certification
* skill matrix
* training compliance

**Key entities**

* Course
* CourseSession
* LearningPath
* LearningEnrollment
* TrainingAttendance
* Certification
* Skill
* SkillProfile
* CapabilityGap
* DevelopmentPlan

**Key workflows**

* publish course
* assign mandatory training
* enroll learner
* track completion
* renew certification
* assess skill gap
* link learning to role readiness

---

## K. Workforce Planning

Strategic workforce and labor budget planning.

**Purpose**
Plan headcount, labor demand, and workforce budget.

**Owns**

* workforce plans
* hiring plans
* vacancy plans
* labor budget
* scenario planning

**Key entities**

* WorkforcePlan
* WorkforceScenario
* PositionBudget
* HiringForecast
* LaborCostProjection

---

## L. Employee Relations & HR Compliance

Governance layer.

**Purpose**
Ensure workforce policy adherence and regulatory evidence.

**Owns**

* grievance
* disciplinary cases
* policy acknowledgements
* labor compliance checks
* visa / permit tracking
* audit evidence
* statutory workforce reporting

**Key entities**

* GrievanceCase
* DisciplinaryAction
* PolicyDocument
* PolicyAcknowledgement
* ComplianceCheck
* WorkPermitRecord
* HRCaseEvidence

---

## M. Employee Self-Service / Manager Self-Service

Delivery surfaces over HRM.

**Purpose**
Expose governed HR operations to employees and managers.

**ESS capabilities**

* profile view/update
* leave request
* payslip access
* training enrollment
* document download
* claim submission

**MSS capabilities**

* team roster
* leave approval
* overtime approval
* performance reviews
* team compliance view
* succession recommendations

---

# 4. ERP Layered Package Architecture

Using your layered style:

```text
packages/
  domain/
    hrm/
      core-hr/
      organizational-management/
      recruitment/
      onboarding-offboarding/
      time-attendance/
      leave-management/
      payroll/
      compensation-benefits/
      performance-management/
      talent-management/
      learning-development/
      workforce-planning/
      employee-relations/
      hr-compliance/
```

Or more AFENDA-aligned:

```text
packages/hrm/
  src/
    core/
    organization/
    recruitment/
    onboarding/
    attendance/
    leave/
    payroll/
    compensation/
    performance/
    talent/
    learning/
    planning/
    compliance/
    ess/
    mss/
```

Recommended internal structure for each bounded context:

```text
src/
  entities/
  value-objects/
  services/
  policies/
  repositories/
  events/
  workflows/
  dto/
  validators/
  calculators/
  rules/
```

---

# 5. Suggested AFENDA HRM Module Registry

```text
hrm.core-hr
hrm.organization-management
hrm.recruitment
hrm.onboarding-offboarding
hrm.time-attendance
hrm.leave-management
hrm.payroll
hrm.compensation-benefits
hrm.performance-management
hrm.talent-management
hrm.learning-development
hrm.workforce-planning
hrm.employee-relations
hrm.hr-compliance
hrm.employee-self-service
hrm.manager-self-service
```

---

# 6. Important Integration Boundaries

HRM should not be isolated.

## HRM ↔ Finance

Critical for payroll and workforce cost accounting.

**Integrations**

* payroll journal posting to GL
* employer contribution accruals
* leave liability accrual
* bonus accrual
* reimbursement payable
* final settlement payable
* payroll clearing accounts

## HRM ↔ Treasury

* salary bank payment file
* payroll funding status
* rejected payment handling

## HRM ↔ Projects

* labor cost allocation
* timesheet costing
* project staffing

## HRM ↔ MDM

* legal entities
* cost centers
* locations
* departments
* job architecture reference

## HRM ↔ IAM / Security

* user provisioning
* role assignments
* access deactivation on exit
* SoD for payroll approvals

## HRM ↔ Document Management

* employment contracts
* policy acknowledgements
* certification evidence
* employee documents

---

# 7. Payroll Sub-Module Architecture

Since Payroll is one of the main sub-modules you asked for, here is the deeper structure.

## Payroll sub-modules

```text
payroll
├── payroll-foundation
├── payroll-master-data
├── payroll-input-management
├── payroll-calculation-engine
├── statutory-compliance
├── payroll-audit-controls
├── payslip-publication
├── payroll-payments
└── payroll-accounting-integration
```

## Payroll foundation

Owns:

* payroll calendars
* pay groups
* pay frequencies
* period definitions

## Payroll master data

Owns:

* employee pay assignment
* recurring earnings
* recurring deductions
* bank account setup
* tax profile
* contribution profile

## Payroll input management

Owns:

* overtime input
* allowance input
* bonus input
* reimbursement input
* timesheet-derived pay input
* manual adjustment input

## Payroll calculation engine

Owns:

* gross-to-net rules
* element formulas
* retro adjustments
* proration
* off-cycle rules

> **Implementation status:** Stubbed. Foundation (periods, runs, payslips, GL posting) exists; gross-to-net, deductions, statutory items, and net pay calculation are not yet implemented. See [Section 15 — Payroll Calculation Gap](#payroll-calculation-gap).

## Statutory compliance

Owns:

* tax slabs
* social contributions
* statutory filing datasets
* regional payroll rules

> **Implementation status:** Not present. Required for production payroll.

## Payroll audit controls

Owns:

* maker-checker
* variance checks
* negative pay detection
* unusual amount alerts
* approval workflow

## Payslip publication

Owns:

* employee payslip rendering
* secure access
* historical archive

## Payroll payments

Owns:

* bank transfer instructions
* payment batches
* payment status reconciliation

## Payroll accounting integration

Owns:

* payroll journal staging
* GL posting maps
* cost center allocation
* project allocation

---

# 8. Talent Management Sub-Module Architecture

```text
talent-management
├── talent-profile
├── succession-planning
├── career-pathing
├── potential-readiness
├── talent-review
├── internal-mobility
└── retention-risk
```

## Talent profile

* capability summary
* performance history
* potential history
* career aspiration
* mobility preference

## Succession planning

* critical role catalog
* successor slate
* readiness level
* bench strength

## Career pathing

* job family ladder
* lateral pathways
* promotion requirements
* role fit analysis

## Potential & readiness

* potential score
* readiness score
* time-to-ready
* development gap

## Talent review

* talent council session
* 9-box matrix
* action plan tracking

## Internal mobility

* internal opportunity matching
* cross-functional moves
* promotion pipeline

## Retention risk

* key role risk
* flight-risk indicators
* intervention actions

---

# 9. Learning & Development Sub-Module Architecture

```text
learning-development
├── learning-catalog
├── learning-delivery
├── mandatory-compliance-training
├── certification-management
├── skills-and-capability
├── development-plans
└── learning-analytics
```

## Learning catalog

* courses
* programs
* paths
* providers
* materials

## Learning delivery

* classroom sessions
* virtual sessions
* self-paced learning
* attendance
* completion

## Mandatory compliance training

* required role-based courses
* due dates
* overdue alerts
* audit evidence

## Certification management

* employee certifications
* issue/expiry
* renewal cycle
* evidence attachment

## Skills & capability

* skills taxonomy
* proficiency rating
* role skill requirements
* gap analysis

## Development plans

* growth goals
* assigned learning
* manager-approved development actions

## Learning analytics

* completion rate
* capability uplift
* compliance coverage
* skill readiness by org

---

# 10. Key Master Data Model

These are the most important shared HRM master entities.

## Person / Worker master

* person_id
* employee_id
* legal_name
* preferred_name
* birth_date
* government_id
* nationality
* contact data
* address
* status

## Employment master

* employment_id
* employee_id
* legal_entity_id
* department_id
* position_id
* manager_employee_id
* employment_type
* contract_type
* hire_date
* probation_end_date
* termination_date
* status

## Compensation master

* compensation_id
* employee_id
* salary_basis
* base_salary
* currency
* pay_frequency
* pay_group
* allowance package
* deduction package

## Talent master

* talent_profile_id
* employee_id
* career aspiration
* mobility preference
* potential score
* readiness score
* succession status

## Learning master

* learner_profile_id
* employee_id
* current skills
* certifications
* mandatory learning obligations
* development plan linkage

---

# 11. Recommended Domain Events

This is important for your architecture style.

## Core HR events

* `employee.created`
* `employee.hired`
* `employee.transferred`
* `employee.promoted`
* `employee.suspended`
* `employee.terminated`
* `employee.rehired`

## Payroll events

* `payroll.period.opened`
* `payroll.input.submitted`
* `payroll.calculated`
* `payroll.exception.detected`
* `payroll.approved`
* `payroll.payslip.published`
* `payroll.payment.generated`
* `payroll.posted.to_gl`

## Talent events

* `talent.successor.nominated`
* `talent.review.completed`
* `talent.readiness.updated`
* `talent.retention_risk.flagged`

## Learning events

* `learning.course.assigned`
* `learning.enrollment.created`
* `learning.completed`
* `learning.certification.expiring`
* `learning.capability_gap.identified`

---

# 12. Governance and Control Model

For AFENDA-style enterprise design, HRM must be heavily governed.

## Segregation of Duties

Examples:

* payroll preparer cannot approve payroll
* salary change initiator cannot finalize payroll
* talent reviewer cannot self-approve promotion case
* learning admin cannot alter completion evidence without audit trail

## Audit immutability

* employee lifecycle changes append history
* compensation changes produce effective-dated records
* payroll recalculations never overwrite prior approved result without reversal trail
* talent review outcomes are versioned
* certification evidence retains chain-of-custody metadata

## Evidence retention

* payslips retained by policy/jurisdiction
* payroll calculation snapshots retained per statutory rule
* training completion evidence retained for audits
* disciplinary cases retained under controlled retention schedules

---

# 13. Suggested Database Schema Groups

At schema level, I would separate like this:

```text
packages/db/src/schema/hrm/
  hrm-employees.ts
  hrm-employment.ts
  hrm-org.ts
  hrm-positions.ts
  hrm-recruitment.ts
  hrm-onboarding.ts
  hrm-attendance.ts
  hrm-leave.ts
  hrm-payroll.ts
  hrm-compensation.ts
  hrm-performance.ts
  hrm-talent.ts
  hrm-learning.ts
  hrm-workforce-planning.ts
  hrm-compliance.ts
  hrm-case-management.ts
```

---

# 14. Minimal Viable AFENDA HRM Rollout

If you want phased delivery:

## Phase 1 — Workforce foundation

* Core HR
* Organizational Management
* ESS basic
* Onboarding / Offboarding

## Phase 2 — Workforce operations

* Time & Attendance
* Leave Management
* Payroll
* Compensation basics

## Phase 3 — Workforce performance

* Performance Management
* Talent Management
* Learning & Development

## Phase 4 — Enterprise governance

* Workforce Planning
* Employee Relations
* HR Compliance
* advanced analytics and audit evidence

---

# 15. Implementation Status and Wave Coverage

This section maps the target architecture above to the current AFENDA implementation (Waves 1–13). See [hrm-wave13.scaffold.md](hrm-wave13.scaffold.md) for Wave 13 deliverables. A detailed gap analysis compares this chapter against the implementation.

## Domain-to-Wave Mapping

| Domain | Waves | Status | Key Gaps |
|--------|-------|--------|----------|
| Core HR | 1, 13 | Implemented | — |
| Organizational Management | 1 | Implemented | ReportingLine, PositionAssignment (matrix), CostCenterHRLink, HeadcountPlan, freeze position, change supervisor chain |
| Recruitment | 1 | Implemented | — |
| Onboarding & Offboarding | 1 | Implemented | — |
| Time & Attendance | 2 | Implemented | WorkCalendar, ShiftPattern, TimesheetEntry, OvertimeRequest, HolidayCalendar, approve overtime, flag attendance anomaly |
| Leave Management | 2 | Implemented | calculate leave accrual (RecalculateLeaveBalance exists); handoff payroll inputs stub |
| Payroll | 9, 10 | Foundation + stub | See [Payroll Calculation Gap](#payroll-calculation-gap) below |
| Compensation & Benefits | 2 | Implemented | AllowancePolicy, BonusPlan, annual review cycles, incentive plans, process annual increments |
| Performance Management | 11 | Implemented | GoalPlan, Feedback360, RatingModel, open goal cycle, calibrate ratings, link to development plan |
| Talent Management | 11 | Implemented | TalentPool, CareerPath, RetentionRiskAssessment, MobilityPreference, run 9-box review, identify HiPo, assess bench strength |
| Learning & Development | 11 | Implemented | LearningPath, TrainingAttendance, CapabilityGap, DevelopmentPlan, assign mandatory training, renew certification |
| Workforce Planning | 12 | Implemented | — |
| Employee Relations | 12 | Implemented | — |
| HR Compliance | 12 | Implemented | — |
| ESS / MSS | — | Partial | profile view exists; claim submission, document download, overtime approval, team compliance view not present |

## Payroll Calculation Gap

**Section 7** describes the full payroll sub-module. Current implementation:

| Sub-module | Status |
|------------|--------|
| Payroll foundation | Implemented — periods, runs, lock/unlock |
| Payroll master data | Partial — employee pay assignment via compensation package |
| Payroll input management | Stub |
| **Payroll calculation engine** | **Stub** — gross-to-net, element formulas, retro, proration, off-cycle not implemented |
| Statutory compliance | Not present — tax slabs, contributions, regional rules |
| Payroll audit controls | Partial — approval workflow exists |
| Payslip publication | Implemented |
| Payroll payments | Implemented — payment batch generation |
| Payroll accounting integration | Implemented — GL posting |

**Priority:** Implement payroll calculation engine (gross-to-net, deductions, statutory items, net pay) and statutory compliance before production payroll rollout.

## Deferred Scope (Roadmap)

### Tier 2 — Common Enterprise Features (Future Waves)

* Overtime and timesheet management
* Claims / reimbursement
* Document management integration
* Mandatory compliance training
* ESS/MSS claim submission, document download, overtime approval

### Tier 3 — Advanced Talent / Learning (Future Waves)

* Career pathing and internal mobility
* Development plans
* Learning paths
* Talent review (9-box, HiPo, retention risk)
* Learning analytics

### Integration Gaps (Roadmap)

* HRM ↔ Projects (labor cost allocation, timesheet costing)
* HRM ↔ Document Management
* Leave liability accrual, bonus accrual, reimbursement payable

---

# 16. Strong Final Answer

So, the **main HRM sub-modules** in an ERP-grade architecture are:

* Core HR
* Organizational Management
* Recruitment
* Onboarding & Offboarding
* Time, Attendance & Leave
* Payroll
* Compensation & Benefits
* Performance Management
* Talent Management
* Learning & Development
* Workforce Planning
* Employee Relations
* HR Compliance
* ESS / MSS

And the three you specifically called out are absolutely major pillars:

* **Payroll**
* **Talent Management**
* **Learning & Development**

They should be designed as first-class bounded contexts, not as small add-ons.

Next, I can turn this into a **full AFENDA HRM package blueprint** with:

* folder/file structure
* Drizzle schema plan
* service boundaries
* event model
* Payroll-to-GL posting architecture
* UI module map for HR dashboard
