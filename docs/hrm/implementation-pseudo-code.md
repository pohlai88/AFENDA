# Phase 1 HRM Commands — Pseudo-Code Handlers

Minimal pseudo-code for **promote-employee**, **add-employment-contract**, and **change-employment-terms** to drop into the codebase and run tests.

---

## 1. promote-employee

**Route:** `POST /v1/hrm/employments/promote`  
**Event:** `HRM.EMPLOYEE_PROMOTED`  
**Audit:** `hrm.employee.promoted`

```ts
async function promoteEmployee(db, orgId, actorId, correlationId, performedAt, input) {
  // 1. Validate
  if (!input.gradeId && !input.positionId && !input.jobId)
    return err("At least one of gradeId, positionId, jobId required");
  const employment = await getEmployment(db, orgId, input.employmentId);
  if (!employment || !["active","probation","suspended"].includes(employment.status))
    return err("Employment not found or not promotable");
  const current = await getCurrentWorkAssignment(db, orgId, input.employmentId);
  if (!current) return err("Current work assignment not found");
  const gradeChanged = input.gradeId && input.gradeId !== current.gradeId;
  const positionChanged = input.positionId && input.positionId !== current.positionId;
  const jobChanged = input.jobId && input.jobId !== current.jobId;
  if (!gradeChanged && !positionChanged && !jobChanged)
    return err("No change in grade/position/job");

  // 2. Check overlap
  const overlapping = await findOverlappingAssignments(db, orgId, input.employmentId, input.effectiveFrom, current.id);
  if (overlapping.length > 0) return err("Overlapping work assignments");

  // 3. Transaction
  return db.transaction(async (tx) => {
    await tx.update(hrmWorkAssignments).set({ effectiveTo, isCurrent: false, assignmentStatus: "historical" })
      .where(eq(id, current.id));
    const [newAssignment] = await tx.insert(hrmWorkAssignments).values({
      ...current, positionId: input.positionId ?? current.positionId, jobId: input.jobId ?? current.jobId,
      gradeId: input.gradeId ?? current.gradeId, effectiveFrom, changeReason, isCurrent: true,
    }).returning();
    const payload = { employmentId, previousWorkAssignmentId: current.id, newWorkAssignmentId: newAssignment.id, ... };
    await tx.insert(auditLog).values({ action: "hrm.employee.promoted", entityType: "hrm_employment", entityId, details: payload });
    await tx.insert(outboxEvent).values({ type: "HRM.EMPLOYEE_PROMOTED", payload });
    return ok({ employmentId, previousWorkAssignmentId, newWorkAssignmentId });
  });
}
```

---

## 2. add-employment-contract

**Route:** `POST /v1/hrm/employments/:employmentId/contracts`  
**Event:** `HRM.EMPLOYMENT_CONTRACT_ADDED`  
**Audit:** `hrm.employment.contract.added`

```ts
async function addEmploymentContract(db, orgId, actorId, correlationId, performedAt, input) {
  // 1. Validate
  if (!input.contractNumber || !input.contractType || !input.contractStartDate)
    return err("contractNumber, contractType, contractStartDate required");
  if (input.contractEndDate && input.contractEndDate < input.contractStartDate)
    return err("contractEndDate must be >= contractStartDate");
  const employment = await getEmployment(db, orgId, input.employmentId);
  if (!employment || ["terminated","inactive"].includes(employment.status))
    return err("Employment not found or inactive");

  // 2. Transaction
  return db.transaction(async (tx) => {
    const [contract] = await tx.insert(hrmEmploymentContracts).values({
      employmentId, contractNumber, contractType, contractStartDate, contractEndDate, documentFileId,
    }).returning();
    const payload = { contractId: contract.id, employmentId, contractNumber, contractType, ... };
    await tx.insert(auditLog).values({ action: "hrm.employment.contract.added", entityType: "hrm_employment_contract", entityId: contract.id, details: payload });
    await tx.insert(outboxEvent).values({ type: "HRM.EMPLOYMENT_CONTRACT_ADDED", payload });
    return ok({ contractId: contract.id, employmentId });
  });
}
```

---

## 3. change-employment-terms

**Route:** `POST /v1/hrm/employments/:employmentId/change-terms`  
**Event:** `HRM.EMPLOYMENT_TERMS_CHANGED`  
**Audit:** `hrm.employment.terms.changed`

```ts
async function changeEmploymentTerms(db, orgId, actorId, correlationId, performedAt, input) {
  // 1. Validate
  if (!input.fteRatio && !input.probationEndDate && !input.employmentType)
    return err("At least one of fteRatio, probationEndDate, employmentType required");
  if (input.employmentType === "contract" && !input.contract)
    return err("contract required when employmentType is 'contract'");
  if (input.probationEndDate && input.probationEndDate < input.effectiveFrom)
    return err("probationEndDate must be >= effectiveFrom");
  if (input.fteRatio && (parseFloat(input.fteRatio) < 0.0001 || parseFloat(input.fteRatio) > 1))
    return err("fteRatio must be 0.0001–1.0000");
  const employment = await getEmployment(db, orgId, input.employmentId);
  if (!employment || !["active","probation","suspended"].includes(employment.status))
    return err("Employment not found or not eligible");

  // 2. Transaction
  return db.transaction(async (tx) => {
    let contractId;
    let previousFte;

    // FTE change: close current assignment, create new with new fte
    if (input.fteRatio) {
      const current = await getCurrentWorkAssignment(tx, orgId, input.employmentId);
      if (!current) throw new Error("Current work assignment not found");
      previousFte = current.fteRatio;
      await tx.update(hrmWorkAssignments).set({ effectiveTo, isCurrent: false, assignmentStatus: "historical" }).where(eq(id, current.id));
      await tx.insert(hrmWorkAssignments).values({ ...current, fteRatio: input.fteRatio, effectiveFrom, changeReason, isCurrent: true });
    }

    // Probation extension
    if (input.probationEndDate)
      await tx.update(hrmEmploymentRecords).set({ probationEndDate: input.probationEndDate }).where(eq(id, input.employmentId));

    // Employment type change
    if (input.employmentType)
      await tx.update(hrmEmploymentRecords).set({ employmentType: input.employmentType }).where(eq(id, input.employmentId));

    // Contract creation when employmentType → contract
    if (input.employmentType === "contract" && input.contract) {
      const [c] = await tx.insert(hrmEmploymentContracts).values({ employmentId, ...input.contract }).returning();
      contractId = c.id;
      await tx.insert(auditLog).values({ action: "hrm.employment.contract.added", entityType: "hrm_employment_contract", entityId: c.id, details: {...} });
      await tx.insert(outboxEvent).values({ type: "HRM.EMPLOYMENT_CONTRACT_ADDED", payload: {...} });
    }

    const payload = { employmentId, effectiveFrom, previousValues: {...}, newValues: {...}, contractId, actorId, performedAt, correlationId };
    await tx.insert(auditLog).values({ action: "hrm.employment.terms.changed", entityType: "hrm_employment", entityId: input.employmentId, details: payload });
    await tx.insert(outboxEvent).values({ type: "HRM.EMPLOYMENT_TERMS_CHANGED", payload });
    return ok({ employmentId, contractId });
  });
}
```

---

## Migration DDL (0060)

```sql
-- Extend hrm_employment_contracts for Phase 1 spec
ALTER TABLE "hrm_employment_contracts" ADD COLUMN "contract_status" varchar(50) DEFAULT 'active';
ALTER TABLE "hrm_employment_contracts" ADD COLUMN "signed_by" uuid;
ALTER TABLE "hrm_employment_contracts" ADD COLUMN "signed_at" timestamp with time zone;
ALTER TABLE "hrm_employment_contracts" ADD COLUMN "document_checksum" varchar(128);
```

---

## Idempotency and Concurrency

- Use `correlationId` as idempotency key for command handlers.
- Lock employment row during updates (implicit via transaction) to avoid race conditions.
- For `add-employment-contract`, consider unique constraint on `(org_id, employment_id, contract_number)` to prevent duplicates.

---

## Phase 2 Deferrals

- Grade progression validation (newGrade > previousGrade) — gate behind config flag.
- `impactAssessmentRequired` and `HRM.EMPLOYMENT_TERMS_IMPACT_ASSESSMENT_REQUIRED` — implement when payroll/benefits integration is ready.
- Approval workflows, SoD enforcement — policy owner sign-off required.
