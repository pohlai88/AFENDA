# Wave 12 — Strategic Implementation Plan

> **Purpose:** Preparation guide for end-to-end implementation of HRM Phase 4 (Wave 12).  
> **Use:** Follow this plan when implementing W12-R1 through W12-R4.

---

## 1. Wave 12 Scope Summary

| Requirement | Domain | Key Entities | Dependencies |
|-------------|--------|--------------|--------------|
| **W12-R1** | Compliance | PolicyDocument, PolicyAcknowledgement, ComplianceCheck, WorkPermitRecord | employment |
| **W12-R2** | Employee Relations | GrievanceCase, DisciplinaryAction, HRCaseEvidence | employment |
| **W12-R3** | Workforce Planning | WorkforcePlan, Scenario, PositionBudget, HiringForecast, LaborCostProjection | org_unit, position |

---

## 2. Existing Dependencies (from prior waves)

| Entity | Source | Use in Wave 12 |
|--------|--------|----------------|
| `hrmEmploymentRecords` | hrm-employment | All three domains (employment_id) |
| `hrmOrgUnits` | hrm-organization | Workforce planning (org_unit_id) |
| `hrmPositions` | hrm-organization | Workforce planning (position_id) |
| `auditLog`, `outboxEvent` | kernel | All mutations |
| `orgColumns`, `metadataColumns` | hrm/_shared | All new tables |
| `money()` | hrm/_shared | Labor cost, budget amount |

---

## 3. Implementation Order and Rationale

### Phase 1: W12-R1 — Policy acknowledgement and compliance

**Rationale:** Lowest coupling, no cross-domain dependencies. Establishes audit/evidence patterns for W12-R2.

**Steps:**
1. **Contracts** — `compliance.entity.ts`, `compliance.commands.ts`, `compliance.queries.ts`
2. **DB schema** — `hrm-compliance.ts` (policy_documents, policy_acknowledgements, compliance_checks, work_permit_records)
3. **Core services** — create-policy-document, record-policy-acknowledgement, create-compliance-check, record-work-permit
4. **Queries** — list-policy-acknowledgements, list-compliance-checks-by-employee, list-overdue-compliance-checks
5. **API routes** — POST/GET for each command/query
6. **Worker** — Add event types to HRM manifest
7. **Tests** — Invariant tests (no duplicate acknowledgement, etc.)

**Design notes:**
- `policy_acknowledgements`: unique on (employment_id, policy_document_id) to prevent duplicates
- `compliance_checks`: check_type enum (e.g. background_check, medical, training)
- `work_permit_records`: permit_type, permit_number, issued_date, expiry_date

---

### Phase 2: W12-R2 — Employee relations case handling

**Rationale:** Builds on compliance patterns. Sensitive data — ensure audit hardening and access control.

**Steps:**
1. **Contracts** — `employee-relations.entity.ts`, `employee-relations.commands.ts`, `employee-relations.queries.ts`
2. **DB schema** — `hrm-case-management.ts` (grievance_cases, disciplinary_actions, hr_case_evidence)
3. **Core services** — create-grievance-case, create-disciplinary-action, attach-evidence, close-case
4. **Queries** — list-cases-by-employee, list-open-cases, list-case-evidence
5. **API routes** — POST/GET for each
6. **Tests** — Invariant: case cannot be closed without required evidence (if configured)

**Design notes:**
- `hr_case_evidence`: polymorphic case_id (grievance or disciplinary) — use `case_type` + `case_id` or separate FKs
- **Simpler approach:** `grievance_case_evidence` and `disciplinary_case_evidence` as separate tables, or single `hr_case_evidence` with `case_type` enum + `grievance_case_id` / `disciplinary_case_id` (one non-null)
- **Recommended:** Single `hr_case_evidence` with `case_type` (grievance | disciplinary) and `case_id` (uuid) — generic enough for future case types

---

### Phase 3: W12-R3 — Workforce planning and headcount projection

**Rationale:** Integrates with org structure and positions. Most complex domain.

**Steps:**
1. **Contracts** — `workforce-planning.entity.ts`, `workforce-planning.commands.ts`, `workforce-planning.queries.ts`
2. **DB schema** — `hrm-workforce-planning.ts` (workforce_plans, workforce_scenarios, position_budgets, hiring_forecasts, labor_cost_projections)
3. **Core services** — create-workforce-plan, create-scenario, set-position-budget, create-hiring-forecast
4. **Queries** — list-workforce-plans, get-scenario-projection, list-headcount-by-org
5. **API routes** — POST/GET for each
6. **Tests** — Invariant: workforce plan scenario transitions

**Design notes:**
- `position_budgets`: org_unit_id + position_id + plan_year — approved headcount, budget_amount (bigint minor units)
- `hiring_forecasts`: workforce_plan_id, position_id, quarter (e.g. "2025-Q1"), planned_hires
- `labor_cost_projections`: workforce_plan_id, scenario_id, org_unit_id, projected_amount
- `assumptions_json` in scenarios — flexible for different planning models

---

### Phase 4: W12-R4 — Validation and closure

- Run all invariant tests
- Run `pnpm check:all` (22 gates)
- Update scaffold status
- Add contract-db sync pairs
- Add UI surfaces (optional for Wave 12 — scaffold does not mandate; add if time permits)

---

## 4. Schema Design Decisions

### W12-R1: Compliance

```
policy_documents
  - document_code (unique per org)
  - document_name, version
  - effective_from (date), effective_to (date, nullable)
  - required_role (varchar, nullable — e.g. "employee", "manager")

policy_acknowledgements
  - employment_id (FK)
  - policy_document_id (FK)
  - acknowledged_at (timestamptz)
  - ip_address (varchar, nullable)
  - UNIQUE(org_id, employment_id, policy_document_id)

compliance_checks
  - employment_id (FK)
  - check_type (varchar: background_check, medical, training, etc.)
  - check_date (date)
  - due_date (date, nullable)
  - status (varchar: pending, passed, failed, overdue)

work_permit_records
  - employment_id (FK)
  - permit_type (varchar)
  - permit_number (varchar)
  - issued_date (date)
  - expiry_date (date)
```

### W12-R2: Employee Relations

```
grievance_cases
  - employment_id (FK)
  - case_type (varchar: grievance, complaint, etc.)
  - opened_at (timestamptz)
  - status (varchar: open, investigating, resolved, closed)
  - resolved_at (timestamptz, nullable)
  - resolution_notes (text, nullable)

disciplinary_actions
  - employment_id (FK)
  - action_type (varchar: warning, suspension, termination, etc.)
  - effective_date (date)
  - status (varchar: draft, active, rescinded)
  - notes (text, nullable)

hr_case_evidence
  - case_type (varchar: grievance | disciplinary)
  - case_id (uuid — references grievance_cases.id or disciplinary_actions.id)
  - evidence_type (varchar: document, note, etc.)
  - file_reference (varchar — storage path or external ref)
  - recorded_at (timestamptz)
```
**Note:** Polymorphic `case_id` requires application-level validation (case_type + case_id must match). Alternative: two tables `grievance_case_evidence` and `disciplinary_case_evidence` for strict FK integrity.

### W12-R3: Workforce Planning

```
workforce_plans
  - plan_code (unique per org)
  - plan_name
  - plan_year (integer)
  - status (varchar: draft, active, locked)

workforce_scenarios
  - workforce_plan_id (FK)
  - scenario_name
  - assumptions_json (jsonb)

position_budgets
  - org_unit_id (FK)
  - position_id (FK)
  - plan_year (integer)
  - approved_headcount (integer)
  - budget_amount (bigint, minor units)
  - UNIQUE(org_id, org_unit_id, position_id, plan_year)

hiring_forecasts
  - workforce_plan_id (FK)
  - position_id (FK)
  - quarter (varchar: "2025-Q1")
  - planned_hires (integer)
  - UNIQUE(org_id, workforce_plan_id, position_id, quarter)

labor_cost_projections
  - workforce_plan_id (FK)
  - scenario_id (FK)
  - org_unit_id (FK)
  - projected_amount (bigint, minor units)
  - UNIQUE(org_id, workforce_plan_id, scenario_id, org_unit_id)
```

---

## 5. Error Codes and Events to Add

### HRM Error Codes (hrm-error-codes.ts)
- `POLICY_DOCUMENT_NOT_FOUND`
- `POLICY_ACKNOWLEDGEMENT_ALREADY_EXISTS`
- `COMPLIANCE_CHECK_NOT_FOUND`
- `WORK_PERMIT_NOT_FOUND`
- `GRIEVANCE_CASE_NOT_FOUND`
- `DISCIPLINARY_ACTION_NOT_FOUND`
- `CASE_EVIDENCE_NOT_FOUND`
- `WORKFORCE_PLAN_NOT_FOUND`
- `WORKFORCE_SCENARIO_NOT_FOUND`
- `POSITION_BUDGET_NOT_FOUND`

### HRM Events (hrm-events.ts)
- `POLICY_DOCUMENT_CREATED`
- `POLICY_ACKNOWLEDGED`
- `COMPLIANCE_CHECK_CREATED`
- `WORK_PERMIT_RECORDED`
- `GRIEVANCE_CASE_CREATED`
- `DISCIPLINARY_ACTION_CREATED`
- `CASE_EVIDENCE_ATTACHED`
- `CASE_CLOSED`
- `WORKFORCE_PLAN_CREATED`
- `WORKFORCE_SCENARIO_CREATED`
- `POSITION_BUDGET_SET`
- `HIRING_FORECAST_CREATED`

---

## 6. Checklist Per Requirement

### W12-R1
- [ ] `compliance.entity.ts` — PolicyDocument, PolicyAcknowledgement, ComplianceCheck, WorkPermitRecord
- [ ] `compliance.commands.ts` — CreatePolicyDocument, RecordAcknowledgement, CreateComplianceCheck, RecordWorkPermit
- [ ] `compliance.queries.ts` — ListAcknowledgements, ListComplianceChecksByEmployee, ListOverdueComplianceChecks
- [ ] `hrm-compliance.ts` — 4 tables
- [ ] Migration generated and applied
- [ ] 4 services + 3 queries
- [ ] API routes registered
- [ ] Worker manifest + process-outbox-event
- [ ] Contract-db sync pairs
- [ ] Invariant test: no duplicate acknowledgement

### W12-R2
- [ ] `employee-relations.entity.ts` — GrievanceCase, DisciplinaryAction, HRCaseEvidence
- [ ] `employee-relations.commands.ts` — CreateGrievanceCase, CreateDisciplinaryAction, AttachEvidence, CloseCase
- [ ] `employee-relations.queries.ts` — ListCasesByEmployee, ListOpenCases, ListCaseEvidence
- [ ] `hrm-case-management.ts` — 3 tables
- [ ] Migration generated and applied
- [ ] 4 services + 3 queries
- [ ] API routes registered
- [ ] Worker manifest + process-outbox-event
- [ ] Contract-db sync pairs
- [ ] Invariant test: case close without evidence (if configured)

### W12-R3
- [ ] `workforce-planning.entity.ts` — WorkforcePlan, Scenario, PositionBudget, HiringForecast, LaborCostProjection
- [ ] `workforce-planning.commands.ts` — CreateWorkforcePlan, CreateScenario, SetPositionBudget, CreateHiringForecast
- [ ] `workforce-planning.queries.ts` — ListWorkforcePlans, GetScenarioProjection, ListHeadcountByOrg
- [ ] `hrm-workforce-planning.ts` — 5 tables
- [ ] Migration generated and applied
- [ ] 4 services + 3 queries
- [ ] API routes registered
- [ ] Worker manifest + process-outbox-event
- [ ] Contract-db sync pairs
- [ ] Invariant test: scenario transitions

### W12-R4
- [ ] All tests pass: `pnpm --filter @afenda/core test -- src/erp/hr/compliance/ src/erp/hr/employee-relations/ src/erp/hr/workforce-planning/`
- [ ] All gates pass: `pnpm check:all`
- [ ] Scaffold status updated to DONE

---

## 7. Risk and Mitigation

| Risk | Mitigation |
|------|------------|
| Polymorphic case_id in hr_case_evidence | Use separate evidence tables per case type, or enforce case_type+case_id in service layer |
| Sensitive data in employee relations | Audit log redaction (already in place); restrict API by permission |
| Labor cost precision | Use bigint minor units (cents) — consistent with AGENTS.md |
| Workforce plan / recruitment overlap | Keep workforce planning as planning layer; requisitions remain execution layer |

---

## 8. Quick Start Command

When ready to implement:

```bash
# Start with W12-R1
# 1. Create contracts
# 2. Create DB schema
pnpm db:generate
pnpm db:migrate
# 3. Implement services, queries, API routes
# 4. Add tests
pnpm --filter @afenda/core test -- src/erp/hr/compliance/
pnpm check:all
```

---

**Document version:** 1.0  
**Last updated:** 2026-03-13
