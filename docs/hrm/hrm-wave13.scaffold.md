# AFENDA HRM — Wave 13: Core HR Enhancement (Gap Closure)

Wave 13 closes Core HR gaps identified in the domain gap analysis (Section 3.A):

- PersonIdentity — table exists, add record + list API
- suspend worker — status exists, add suspend-employee command
- resume worker — add resume-employee command (reverse suspend)
- EmployeeAddress — new table + full stack
- EmergencyContact — new table + full stack
- Dependent — new table + full stack
- EmployeeDocument — new table + full stack (file reference)
- promote worker — `promote-employee` command (semantic wrapper over transfer)
- EmploymentContract addendum — `add-employment-contract` command
- change employment terms — `change-employment-terms` command (FTE, probation, employment type)

## Wave Status: DONE

---

# Directory Hints

- Contracts: `packages/contracts/src/erp/hr/`
- DB schema: `packages/db/src/schema/erp/hrm/`
- Core: `packages/core/src/erp/hr/`
- API: `apps/api/src/routes/erp/hr/`
- Tests: `**/__vitest_test__/`

---

# Wave Metadata

- Wave ID: Wave 13
- Scope: Core HR enhancement — person identities, suspend/resume, addresses, contacts, dependents, documents, promote, contract addendum, change terms
- Document role: Scaffold + closure tracker
- Last updated: 2026-03-13

---

# Deliverables

## W13-1. Suspend / Resume Employment

- [x] SuspendEmploymentCommandSchema, SuspendEmploymentResultSchema
- [x] ResumeEmploymentCommandSchema, ResumeEmploymentResultSchema
- [x] suspendEmployment service
- [x] resumeEmployment service
- [x] API routes: POST /v1/hrm/employments/suspend, POST /v1/hrm/employments/resume
- [x] HRM_EVENTS: EMPLOYEE_SUSPENDED, EMPLOYEE_RESUMED
- [x] Error codes: HRM_EMPLOYMENT_ALREADY_SUSPENDED, HRM_EMPLOYMENT_NOT_SUSPENDED
- [x] Test: suspend-employment.audit-outbox.test.ts
- [x] Test: resume-employment.audit-outbox.test.ts

## W13-2. Person Identity (record + list)

- [x] HrmPersonIdentitySchema in core.entity
- [x] RecordPersonIdentityCommandSchema, RecordPersonIdentityResultSchema
- [x] recordPersonIdentity service
- [x] listPersonIdentities query
- [x] API routes: POST /v1/hrm/persons/:personId/identities, GET /v1/hrm/persons/:personId/identities
- [x] HRM_EVENTS: PERSON_IDENTITY_RECORDED

## W13-3. Person Address

- [x] HrmPersonAddressSchema
- [x] addPersonAddress, listPersonAddresses
- [x] DB: hrm_person_addresses
- [x] API routes: POST /v1/hrm/persons/:personId/addresses, GET /v1/hrm/persons/:personId/addresses

## W13-4. Emergency Contact

- [x] HrmEmergencyContactSchema
- [x] addEmergencyContact, listEmergencyContacts
- [x] DB: hrm_person_emergency_contacts
- [x] API routes: POST /v1/hrm/persons/:personId/emergency-contacts, GET /v1/hrm/persons/:personId/emergency-contacts

## W13-5. Dependent

- [x] HrmDependentSchema
- [x] addDependent, listDependents
- [x] DB: hrm_person_dependents
- [x] API routes: POST /v1/hrm/persons/:personId/dependents, GET /v1/hrm/persons/:personId/dependents

## W13-6. Employee Document

- [x] HrmEmployeeDocumentSchema
- [x] addEmployeeDocument, listEmployeeDocuments
- [x] DB: hrm_employee_documents
- [x] API routes: POST /v1/hrm/employments/:employmentId/documents, GET /v1/hrm/employments/:employmentId/documents

## W13-7. Promote Employee

- [x] PromoteEmployeeCommandSchema, PromoteEmployeeResultSchema
- [x] promoteEmployee service
- [x] API route: POST /v1/hrm/employments/promote
- [x] HRM_EVENTS: EMPLOYEE_PROMOTED
- [x] Test: promote-employee.audit-outbox.test.ts

## W13-8. Add Employment Contract

- [x] AddEmploymentContractCommandSchema, AddEmploymentContractResultSchema
- [x] addEmploymentContract service
- [x] API route: POST /v1/hrm/employments/:employmentId/contracts
- [x] HRM_EVENTS: EMPLOYMENT_CONTRACT_ADDED
- [x] DB: hrm_employment_contracts (extended with contract_status, signed_by, signed_at, document_checksum in migration 0060)
- [x] Test: add-employment-contract.audit-outbox.test.ts

## W13-9. Change Employment Terms

- [x] ChangeEmploymentTermsCommandSchema, ChangeEmploymentTermsResultSchema
- [x] changeEmploymentTerms service
- [x] API route: POST /v1/hrm/employments/:employmentId/change-terms
- [x] HRM_EVENTS: EMPLOYMENT_TERMS_CHANGED
- [x] Phase 1 scope: FTE change, probation extension, employment type change; contract creation when employmentType → contract
- [x] Test: change-employment-terms.audit-outbox.test.ts

---

# Test Coverage

| Deliverable | Unit/Integration Test |
|-------------|------------------------|
| W13-1 Suspend | suspend-employment.audit-outbox.test.ts |
| W13-1 Resume | resume-employment.audit-outbox.test.ts |
| W13-7 Promote | promote-employee.audit-outbox.test.ts |
| W13-8 Add Contract | add-employment-contract.audit-outbox.test.ts |
| W13-9 Change Terms | change-employment-terms.audit-outbox.test.ts |

---

# How to Run

**Tests (from repo root):**
```bash
pnpm --filter @afenda/core test -- --run src/erp/hr/core/__vitest_test__/
```

**API routes (require API + auth):**
```bash
pnpm dev
# POST /v1/hrm/employments/suspend | resume | promote
# POST /v1/hrm/employments/:employmentId/contracts
# POST /v1/hrm/employments/:employmentId/change-terms
```

---

# Phase 2 (Implementation Artifacts)

See **`docs/hrm/phase2-implementation-artifacts.md`** for:

- **A.** Idempotent command handler pseudo-code (lock + idempotency flow)
- **B.** Postgres DDL (retroactive, contract metadata, impact_assessment_status)
- **C.** Test templates: idempotency, retroactive, file validation, impact assessment
- **D.** Rollout checklist and feature-flag names

**Feature flags:** `hrm.validate_grade_progression`, `hrm.require_impact_assessment`, `hrm.validate_document_file`, `hrm.phase2_pilot_enabled`

---

# Why These Were Omitted (Root Cause)

Waves 1–3 delivered the minimal spine: person → employee → employment → hire/transfer/terminate/rehire. Extended person attributes (identities, addresses, contacts, dependents, documents) and status transitions (suspend, resume) were deprioritized to ship the core lifecycle first. Promote, contract addendum, and change-terms were deferred until policy spec and transfer logic were stable. The design doc (hrm-db-design) described these entities but they were never scaffolded in any wave.
