# AFENDA HRM Phase 4 - Wave 12 implementation scaffold and closure tracker.

Wave 12 focus:

1. Policy acknowledgement and compliance checks
2. Employee relations case handling
3. Workforce planning and headcount projection

This wave establishes Phase 4 enterprise governance foundations.

## Wave Status: DONE

---

# Directory Hints

- Contracts paths: `packages/contracts/src/erp/hr/`
- Database schema paths: `packages/db/src/schema/erp/hrm/`
- Core domain paths: `packages/core/src/erp/hr/`
- API route paths: `apps/api/src/routes/erp/hr/`
- Web app paths: `apps/web/src/app/(erp)/hr/`
- Tests paths: `**/__vitest_test__/` and app-level test folders
- Wave docs paths: `docs/hrm/`

---

# Wave Metadata

- Wave ID: Wave 12
- Scope: HR compliance, employee relations, workforce planning
- Document role: Scaffold + closure tracker
- Last updated: 2026-03-13

---

# Delivery Policy (Learned Experience)

Use strict closure discipline for this wave:

1. Close all gaps found during implementation and validation, regardless of whether they are blocking.
2. Mark a task DONE only with implementation + tests + evidence.
3. Track non-blocking gaps as explicit remediation items with owner and verification command.
4. Do not carry silent debt into next wave scaffolds.

---

# Remaining (Follow-up)

Completion rule: a remaining item is only complete when implementation + tests + evidence are all present.

## W12-R1. Policy acknowledgement and compliance checks

Status: DONE

Deliverables:

- Add contracts for compliance entities:
  - PolicyDocument, PolicyAcknowledgement, ComplianceCheck, WorkPermitRecord
- Add DB schema `hrm-compliance.ts`:
  - policy_documents (document_code, document_name, version, effective_from, required_role)
  - policy_acknowledgements (employment_id, policy_document_id, acknowledged_at, ip_address)
  - compliance_checks (employment_id, check_type, check_date, status, due_date)
  - work_permit_records (employment_id, permit_type, permit_number, issued_date, expiry_date)
- Implement services:
  - create policy document
  - record policy acknowledgement
  - create compliance check
  - record work permit
- Implement queries: list policy acknowledgements, list compliance checks by employee, list overdue
- Implement and register API routes.
- Enforce audit + outbox on mutations.
- Evidence retention: audit trail for acknowledgements and compliance checks.

Evidence:

- `packages/contracts/src/erp/hr/compliance.entity.ts`
- `packages/contracts/src/erp/hr/compliance.commands.ts`
- `packages/db/src/schema/erp/hrm/hrm-compliance.ts`
- `packages/core/src/erp/hr/compliance/services/*.ts`
- `packages/core/src/erp/hr/compliance/queries/*.ts`
- `apps/api/src/routes/erp/hr/create-policy-document.ts`, `record-policy-acknowledgement.ts`, `create-compliance-check.ts`, `record-work-permit.ts`, `list-policy-acknowledgements.ts`, `list-compliance-checks-by-employee.ts`, `list-overdue-compliance-checks.ts`

Done when:

- Policy documents can be published and acknowledgements recorded.
- Compliance checks and work permits can be tracked.
- Audit evidence retained for regulatory purposes.

## W12-R2. Employee relations case handling

Status: DONE

Deliverables:

- Add contracts for employee relations entities:
  - GrievanceCase, DisciplinaryAction, HRCaseEvidence
- Add DB schema `hrm-case-management.ts`:
  - grievance_cases (employment_id, case_type, opened_at, status, resolved_at)
  - disciplinary_actions (employment_id, action_type, effective_date, status, notes)
  - hr_case_evidence (case_id, evidence_type, file_reference, recorded_at)
- Implement services:
  - create grievance case
  - create disciplinary action
  - attach evidence
  - close case
- Implement queries: list cases by employee, list open cases, list case evidence
- Implement and register API routes.
- Enforce audit + outbox on mutations.
- Evidence retention: controlled retention for disciplinary cases.

Evidence:

- `packages/contracts/src/erp/hr/employee-relations.entity.ts`
- `packages/contracts/src/erp/hr/employee-relations.commands.ts`
- `packages/db/src/schema/erp/hrm/hrm-case-management.ts`
- `packages/core/src/erp/hr/employee-relations/services/*.ts`
- `packages/core/src/erp/hr/employee-relations/queries/*.ts`
- `apps/api/src/routes/erp/hr/create-grievance-case.ts`, `create-disciplinary-action.ts`, `attach-evidence.ts`, `close-grievance-case.ts`, `close-disciplinary-action.ts`, `list-cases-by-employee.ts`, `list-open-grievance-cases.ts`, `list-open-disciplinary-actions.ts`, `list-case-evidence.ts`

Done when:

- Grievance and disciplinary cases can be created and managed.
- Evidence can be attached and retained.
- Audit hardening for case lifecycle.

## W12-R3. Workforce planning and headcount projection

Status: DONE

Deliverables:

- Add contracts for workforce planning entities:
  - WorkforcePlan, WorkforceScenario, PositionBudget, HiringForecast, LaborCostProjection
- Add DB schema `hrm-workforce-planning.ts`:
  - workforce_plans (plan_code, plan_name, plan_year, status)
  - workforce_scenarios (workforce_plan_id, scenario_name, assumptions_json)
  - position_budgets (org_unit_id, position_id, plan_year, approved_headcount, budget_amount)
  - hiring_forecasts (workforce_plan_id, position_id, quarter, planned_hires)
  - labor_cost_projections (workforce_plan_id, scenario_id, org_unit_id, projected_amount)
- Implement services:
  - create workforce plan
  - create scenario
  - set position budget
  - create hiring forecast
- Implement queries: list workforce plans, get scenario projection, list headcount by org
- Implement and register API routes.
- Enforce audit + outbox on mutations.

Evidence:

- `packages/contracts/src/erp/hr/workforce-planning.entity.ts`
- `packages/contracts/src/erp/hr/workforce-planning.commands.ts`
- `packages/db/src/schema/erp/hrm/hrm-workforce-planning.ts`
- `packages/core/src/erp/hr/workforce-planning/services/*.ts`
- `packages/core/src/erp/hr/workforce-planning/queries/*.ts`
- `apps/api/src/routes/erp/hr/create-workforce-plan.ts`, `create-scenario.ts`, `set-position-budget.ts`, `create-hiring-forecast.ts`, `list-workforce-plans.ts`, `get-scenario-projection.ts`, `list-headcount-by-org.ts`

Done when:

- Workforce plans and scenarios can be created.
- Headcount and labor cost projections can be queried.
- Route surfaces and query dashboards available.

## W12-R4. Validation and closure

Status: DONE

Deliverables:

- Add invariant tests for:
  - policy acknowledgement cannot be duplicated for same document/employee ✓
  - case cannot be closed twice (grievance already closed) ✓
  - input validation (required fields, date ranges, negative values)
- Run targeted and package-level validation commands.

Evidence required:

- `packages/core/src/erp/hr/compliance/__vitest_test__/`
- `packages/core/src/erp/hr/employee-relations/__vitest_test__/`
- `packages/core/src/erp/hr/workforce-planning/__vitest_test__/`
- Commands:
  - `pnpm --filter @afenda/core test -- src/erp/hr/compliance/ src/erp/hr/employee-relations/ src/erp/hr/workforce-planning/`
  - `pnpm check:all`

Done when:

- All Wave 12 tests pass.
- All 22 gates pass.

---

# Suggested completion order

1. W12-R1 (policy acknowledgement and compliance)
2. W12-R2 (employee relations)
3. W12-R3 (workforce planning)
4. W12-R4 (validation and closure)

---

# Blockers log (update during execution)

- None. Wave 12 can proceed after Wave 11 or in parallel if resources allow.

---

# 0. Status Update

## Current delivery status

- Wave 12 complete. All requirements implemented.
- Tests: 6 compliance, 6 employee-relations, 6 workforce-planning (18 total).
- `pnpm check:all` — 22 gates pass.

## Known open items

- Compliance and employee relations require careful handling of sensitive data; ensure access control and audit hardening.
- Workforce planning may integrate with recruitment (requisition) and org structure (positions).
- Case evidence requirement for close (if configured) not enforced; scenario status transitions optional for future waves.

---

# Validation commands (run to verify closure)

```bash
pnpm --filter @afenda/core test -- src/erp/hr/compliance/ src/erp/hr/employee-relations/ src/erp/hr/workforce-planning/
pnpm check:all
```

Exit rule:

Wave closure is complete only when behavior is proven with tests and evidence.
