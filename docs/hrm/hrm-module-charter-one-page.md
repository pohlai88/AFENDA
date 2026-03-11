# HRM Module Charter (One Page)

## 1. Domain Mission
Deliver an enterprise-grade HRM parent domain that governs the full workforce lifecycle with auditability, policy control, and seamless ERP integration. HRM must be production-ready, org-scoped, compliant, and architecturally consistent with AFENDA AP standards.

Primary outcomes:
- reliable workforce system of record
- predictable lifecycle transitions (hire, move, leave)
- payroll-to-finance reconciliation integrity
- policy and statutory compliance traceability
- self-service productivity for employees and managers

## 2. Sub-Module Boundaries
HRM is structured as a parent domain with these sub-modules:

- Core HR and Employee Administration
- Organizational Management
- Recruitment and Applicant Tracking
- Onboarding and Offboarding
- Time, Attendance, and Leave
- Payroll
- Compensation and Benefits
- Performance Management
- Talent Management
- Learning and Development
- Employee Self-Service (ESS)
- Manager Self-Service (MSS)
- Workforce Planning
- Claims and Reimbursement
- HR Helpdesk and Case Management
- Compliance and Employee Relations
- Health, Safety, and Welfare

Essential implementation spine for first enterprise rollout:
- Core HR
- Organizational Management
- Recruitment
- Onboarding and Offboarding
- Time, Attendance, and Leave
- Payroll (with GL posting and payment export)
- ESS and MSS
- Compliance and Employee Relations

## 3. Architecture and Integration Contract
HRM must follow AP architecture standards across all layers.

Architecture contract:
- schema-is-truth flow: contracts -> db -> core -> api -> worker -> ui -> tests
- command/query split for all modules
- every mutation uses idempotencyKey
- every mutation runs in withAudit and emits outbox in the same transaction
- strict multi-tenant org isolation on all tables and queries
- result-typed service responses with deterministic error codes and meta

Cross-domain integrations:
- Finance/GL: payroll journals, accruals, reimbursements
- Treasury/payment: salary and payout file export
- Procurement: onboarding/offboarding equipment and services
- CRM/Sales: incentive and commission dependencies where applicable
- Kernel identity/governance: permissions, approvals, audit, policy enforcement

## 4. Release Plan and Gates
R1: Foundation spine
- Core HR, Org Mgmt, Recruitment, Onboarding/Offboarding, Time/Leave, ESS/MSS, Compliance baseline

R2: Payroll and Compensation
- Payroll, Compensation and Benefits, statutory/reporting foundations, GL posting, payment export

R3: Talent and Capability
- Performance, Talent, Learning, Workforce Planning

R4: Enterprise Extensions
- Claims/Reimbursement, Helpdesk/Case Management, Health/Safety/Welfare

R5: Optimization and Hardening
- cross-domain controls, advanced approvals, analytics, operational resilience

Mandatory release gates per wave:
- typecheck clean
- targeted sub-module tests pass
- all mutation paths have audit + outbox assertions
- command/query route contract verification
- full gate run passes before next wave

## 5. Invariants and Success KPIs
Core invariants:
- lifecycle integrity: only legal state transitions are allowed
- payroll integrity: payroll totals reconcile to posted GL journals
- effective-date integrity: no conflicting employment/role/comp periods
- approval integrity: manager/policy approvals enforced before state changes
- compliance integrity: auditable evidence for statutory and policy obligations
- cross-domain integrity: all finance-impacting HR events emit traceable outbox events

KPIs (initial targets):
- payroll-to-GL reconciliation accuracy: 100% per closed payroll period
- HRM command idempotency safety: 100% duplicate-safe mutation handling
- approval SLA compliance: >= 95% within policy SLA windows
- onboarding completion timeliness: >= 95% by start date
- leave and attendance exception resolution: >= 90% within configured SLA
- audit coverage of mutations: 100% of state-changing commands
- release quality: 0 critical gate failures at promotion

## 6. Definition of Done (HRM Release)
A release is done when:
- planned sub-modules for the wave are shipped end-to-end
- architecture contract is satisfied in all affected layers
- invariant tests pass for each introduced workflow
- integration contracts are validated against dependent domains
- production-readiness checks and CI gates pass
