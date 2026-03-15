# HRM Phase 2 — Implementation Artifacts

Implementation-ready artifacts for idempotency, retroactive handling, file validation, feature flags, and rollout.

---

## A. Idempotent Command Handler (TypeScript Pseudo-Code)

The API already has `idempotencyPlugin` that uses `body.idempotencyKey` or `Idempotency-Key` header. Ensure HR routes pass through the key and add **row-level locking** in services.

### Promote / Change-Terms: Lock + Idempotency Flow

```typescript
// 1. API route: ensure idempotencyKey is in body (not omitted)
const BodySchema = PromoteEmployeeCommandSchema.omit({ idempotencyKey: true });
// Client must send Idempotency-Key header OR body.idempotencyKey
// idempotencyPlugin handles dedup at HTTP layer

// 2. Service: acquire row lock on employment during transaction
async function promoteEmployee(db, orgId, actorId, correlationId, performedAt, input) {
  return db.transaction(async (tx) => {
    // Lock employment row for update (prevents concurrent promotions/transfers)
    const [employment] = await tx
      .select()
      .from(hrmEmploymentRecords)
      .where(and(eq(orgId), eq(employmentId)))
      .for("update");  // SELECT ... FOR UPDATE

    if (!employment) return err(EMPLOYMENT_NOT_FOUND);
    // ... rest of validation and logic
  });
}
```

### Drizzle `FOR UPDATE` Pattern

```typescript
import { sql } from "drizzle-orm";

// In transaction:
const [row] = await tx
  .select()
  .from(hrmEmploymentRecords)
  .where(and(eq(hrmEmploymentRecords.orgId, orgId), eq(hrmEmploymentRecords.id, employmentId)))
  .for("update", { skipLocked: false });
```

### Idempotency Check (Already Handled)

- `idempotencyPlugin` preHandler: `beginIdempotency()` claims key
- `duplicate` → return cached response, handler never runs
- `new` → handler runs, `onSend` stores result
- No duplicate audit/outbox when same key replayed

### Concurrency: Serialize on Employment

- `SELECT ... FOR UPDATE` on `hrm_employment_records` at start of promote/change-terms/transfer
- Second request blocks until first commits
- Prevents overlapping work assignments

---

## B. Postgres DDL — Retroactive Flag + Contract Metadata

### Migration 0061 (new file)

```sql
-- B.1: Retroactive flag in audit (stored in details JSONB; no schema change)
-- Audit already includes: details JSONB. Add retroactive: true in application code when effectiveFrom < today.

-- B.2: Optional promotion_history table (if you want explicit retroactive column)
CREATE TABLE IF NOT EXISTS hrm_promotion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  employment_id uuid NOT NULL REFERENCES hrm_employment_records(id),
  previous_work_assignment_id uuid,
  new_work_assignment_id uuid NOT NULL,
  promotion_type varchar(50),
  effective_from date NOT NULL,
  retroactive boolean NOT NULL DEFAULT false,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hrm_promotion_history_employment_idx ON hrm_promotion_history(org_id, employment_id);

-- B.3: Contract metadata columns (migration 0060 already has document_checksum)
-- Add mime_type and file_size if needed:
ALTER TABLE hrm_employment_contracts ADD COLUMN IF NOT EXISTS mime_type varchar(100);
ALTER TABLE hrm_employment_contracts ADD COLUMN IF NOT EXISTS file_size_bytes bigint;

-- B.4: Impact assessment status on employment
ALTER TABLE hrm_employment_records ADD COLUMN IF NOT EXISTS impact_assessment_status varchar(50) DEFAULT 'none';
-- Values: 'none' | 'required' | 'completed'
```

### Application-Level Retroactive Logic

```typescript
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const retroactive = input.effectiveFrom < today;

const payload = {
  ...basePayload,
  retroactive,
  retroactiveFlag: retroactive ? "HRM.EMPLOYEE_PROMOTION_RETROACTIVE" : null,
};
```

---

## C. Test Templates (Vitest)

### C.1. promote-employee.idempotency.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { createTestApp } from "../../../__vitest_test__/helpers/app-factory";

describe("Promote employee idempotency", () => {
  it("returns same result when replayed with same idempotency key", async () => {
    const app = await createTestApp();
    const idempotencyKey = `promote-idem-${Date.now()}`;

    const payload = {
      idempotencyKey,
      employmentId: "emp-1",
      effectiveFrom: "2026-04-01",
      gradeId: "grade-3",
      changeReason: "Merit",
    };

    const res1 = await app.inject({
      method: "POST",
      url: "/v1/hrm/employments/promote",
      headers: { "Idempotency-Key": idempotencyKey, "x-org-id": "org-1" },
      payload,
    });

    const res2 = await app.inject({
      method: "POST",
      url: "/v1/hrm/employments/promote",
      headers: { "Idempotency-Key": idempotencyKey, "x-org-id": "org-1" },
      payload,
    });

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(res1.payload).data).toEqual(JSON.parse(res2.payload).data);

    // Assert no duplicate audit/outbox entries for same correlationId
    const auditCount = await app.db.query.auditLog.findMany({
      where: eq(auditLog.correlationId, res1.correlationId),
    });
    expect(auditCount.length).toBe(1);
  });
});
```

### C.2. change-employment-terms.retroactive.test.ts

```typescript
import { describe, expect, it, vi } from "vitest";
import { changeEmploymentTerms } from "../services/change-employment-terms.service";

describe("Change employment terms retroactive flag", () => {
  it("includes retroactive: true in audit when effectiveFrom < today", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const effectiveFrom = yesterday.toISOString().slice(0, 10);

    const auditValuesMock = vi.fn().mockResolvedValue(undefined);
    // ... setup mock db with employment + assignment ...

    await changeEmploymentTerms(db, "org-1", "actor-1", "corr-1", new Date().toISOString(), {
      employmentId: "emp-1",
      effectiveFrom,
      fteRatio: "0.5000",
    });

    expect(auditValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          retroactive: true,
        }),
      }),
    );
  });
});
```

### C.3. change-employment-terms.impact-assessment.test.ts

```typescript
import { describe, expect, it, vi } from "vitest";
import { changeEmploymentTerms } from "../services/change-employment-terms.service";

describe("Change employment terms impact assessment", () => {
  it("emits HRM.EMPLOYMENT_TERMS_IMPACT_ASSESSMENT_REQUIRED when employmentType changes", async () => {
    const outboxValuesMock = vi.fn().mockResolvedValue(undefined);
    // Setup: employment with type "permanent", change to "contract"
    // ... mock db ...

    await changeEmploymentTerms(db, "org-1", "actor-1", "corr-1", "2026-03-13T12:00:00Z", {
      employmentId: "emp-1",
      effectiveFrom: "2026-04-01",
      employmentType: "contract",
      contract: { contractNumber: "C1", contractType: "fixed", contractStartDate: "2026-04-01" },
    }, { requireImpactAssessment: true });

    expect(outboxValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "HRM.EMPLOYMENT_TERMS_IMPACT_ASSESSMENT_REQUIRED",
        payload: expect.objectContaining({
          employmentId: "emp-1",
          impactReasons: expect.arrayContaining(["employmentType"]),
        }),
      }),
    );
  });
});
```

### C.4. add-employment-contract.file-validation.test.ts

```typescript
import { describe, expect, it, vi } from "vitest";
import { addEmploymentContract } from "../services/add-employment-contract.service";

describe("Add employment contract file validation", () => {
  it("returns error when documentFileId provided but file not found", async () => {
    const fileService = { getById: vi.fn().mockResolvedValue(null) };

    const result = await addEmploymentContract(
      db,
      "org-1",
      "actor-1",
      "corr-1",
      "2026-03-13T12:00:00Z",
      {
        employmentId: "emp-1",
        contractNumber: "CNT-001",
        contractType: "permanent",
        contractStartDate: "2026-01-01",
        documentFileId: "file-missing-uuid",
      },
      { fileService },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_DOCUMENT_FILE_NOT_FOUND");
    }
  });

  it("persists documentChecksum and mimeType when file present", async () => {
    const fileService = {
      getById: vi.fn().mockResolvedValue({
        id: "file-1",
        checksum: "sha256:abc123",
        mimeType: "application/pdf",
        size: 1024,
      }),
    };
    // ... run addEmploymentContract with documentFileId ...
    // Assert insert values include documentChecksum, mimeType
  });
});
```

---

## D. Rollout Checklist & Feature-Flag Names

### Feature Flags (Config Keys)

| Flag | Default | Purpose |
|------|---------|---------|
| `hrm.validate_grade_progression` | `false` | When true, validate newGrade > previousGrade on promote |
| `hrm.require_impact_assessment` | `false` | When true, emit HRM.EMPLOYMENT_TERMS_IMPACT_ASSESSMENT_REQUIRED for FTE/type changes |
| `hrm.validate_document_file` | `false` | When true, require documentFileId to exist when provided |
| `hrm.phase2_pilot_enabled` | `false` | Master switch for HRM Phase 2 pilot rollout |

### Rollout Checklist

- [ ] **Pre-deploy**
  - [ ] Create migration 0061 (retroactive + contract metadata + impact_assessment_status)
  - [ ] Add `SELECT ... FOR UPDATE` to promote, change-terms, transfer
  - [ ] Implement retroactive flag in audit details
  - [ ] Add file validation (optional, behind flag)
  - [ ] Add feature flags to org_setting or env
  - [ ] Run all tests: `pnpm --filter @afenda/core test -- --run src/erp/hr/core/__vitest_test__/`

- [ ] **Deploy**
  - [ ] Deploy with `hrm.phase2_pilot_enabled=false`
  - [ ] Verify existing endpoints unchanged

- [ ] **Pilot**
  - [ ] Enable `hrm.phase2_pilot_enabled=true` for pilot org only
  - [ ] Enable `hrm.validate_document_file=true` for pilot
  - [ ] Monitor: promotions_total, contracts_added_total, terms_changes_total, validation_failures_total
  - [ ] Run pilot for 2 weeks; check for duplicate audit/outbox, validation failures

- [ ] **Post-pilot**
  - [ ] Enable flags globally if stable
  - [ ] Implement payroll/benefits impact consumer (HRM.EMPLOYMENT_TERMS_IMPACT_ASSESSMENT_REQUIRED)
  - [ ] Add monitoring dashboards and alerts

### Runbook

1. **Idempotency replay detected:** Check `idempotency` table for duplicate key; cached response returned; no action.
2. **Validation failure spike:** Check `validation_failures_total`; review recent schema/contract changes; alert on threshold.
3. **Concurrent promotion conflict:** Second request blocks on `FOR UPDATE`; retries succeed after first commits.
