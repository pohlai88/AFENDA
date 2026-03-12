Below is the **AFENDA HRM Phase 1 - Wave 3 implementation scaffold and closure tracker**.

Wave 3 focus:

1. terminate-employment + rehire-employee command path
2. employee profile/list read-model path
3. API route completion for lifecycle and profile/list endpoints
4. route registration and handoff readiness

This wave closes the **hire -> move -> terminate -> rehire -> explain truth** loop.

## Wave Status: DONE

---

# Wave Metadata

- Wave ID: `Wave 3`
- Scope: `Employment lifecycle closure + profile/list read paths`
- Document role: `Scaffold + closure tracker`
- Last updated: `2026-03-12`

---

# Remaining (Follow-up)

Use this as the active closure tracker for Wave 3.

Completion rule: a remaining item is only complete when implementation + tests + evidence are all present.

## W3-R1. Lifecycle service and route completion

Status: `DONE`

Deliverables:

- Implement terminate + rehire services and DTOs.
- Implement terminate/list/profile API routes and ensure registration path exists.

Evidence:

- Core files under `packages/core/src/erp/hr/core/services/` and `packages/core/src/erp/hr/core/dto/`
- Route files under `apps/api/src/routes/erp/hr/`
- Registration snippet in `apps/api/src/index.ts`

## W3-R2. Read-model hardening

Status: `DONE`

Deliverables:

- Ensure employee profile and list queries are production-grade read models.
- Include joins/enrichment/pagination/search details listed in this doc.

Evidence:

- `packages/core/src/erp/hr/core/queries/get-employee-profile.query.ts` includes department/position and manager enrichment (`departmentName`, `positionTitle`, `managerEmployeeCode`, `managerDisplayName`).
- `packages/core/src/erp/hr/core/queries/list-employees.query.ts` includes department/position and manager enrichment plus personal-email search.
- `apps/api/src/routes/erp/hr/get-employee-profile.ts` and `apps/api/src/routes/erp/hr/list-employees.ts` response schemas include the added display fields.
- `packages/core/src/erp/hr/core/__vitest_test__/get-employee-profile.query.test.ts` validates read-model enrichment behavior.

Done when:

- Query behavior is validated with targeted tests and evidence is linked.

## W3-R3. Validation and test closure

Status: `DONE`

Deliverables:

- Add tests for lifecycle transitions and read-model behavior.
- Record test outputs and invariant coverage mapping.

Evidence:

- Test files:
  - `packages/core/src/erp/hr/core/__vitest_test__/rehire-employee.service.test.ts`
  - `packages/core/src/erp/hr/core/__vitest_test__/get-employee-profile.query.test.ts`
- Command outputs (2026-03-11):
  - `pnpm --filter @afenda/core typecheck` passed.
  - `pnpm --filter @afenda/core test -- src/erp/hr/core/__vitest_test__/rehire-employee.service.test.ts src/erp/hr/core/__vitest_test__/get-employee-profile.query.test.ts` passed.

Coverage mapping:

- Lifecycle transition guards: rehire flow blocks missing employee and active-employment conflict.
- Lifecycle success path: rehire flow returns expected employment/assignment/contract outputs.
- Read-model behavior: employee profile query returns manager display enrichment fields.

---

# 0. Status Update (2026-03-12)

## Current delivery status

- Wave 3 feature scaffolding is present for terminate/rehire/profile/list flows.
- Wave 3 read-model hardening is implemented for profile/list enrichment and search behavior.
- Wave 3 targeted test closure is complete for the implemented lifecycle and read-model scope.

## Evidence snapshot

### Functional implementation evidence

- DTOs for terminate/rehire are present in core DTO paths.
- Services for terminate/rehire are present in core service paths.
- API routes for terminate/get-profile/list-employees are present in route paths.
- Employee profile/list read models expose department/position/manager display fields and list search includes personal email.

### Build evidence

- `pnpm --filter @afenda/core typecheck` completed successfully after read-model updates (2026-03-11).
- `pnpm --filter @afenda/api typecheck` completed successfully after route schema updates (2026-03-11).
- `pnpm --filter @afenda/core test -- src/erp/hr/core/__vitest_test__/rehire-employee.service.test.ts src/erp/hr/core/__vitest_test__/get-employee-profile.query.test.ts` passed (4 tests, 2 files).
- `pnpm --filter @afenda/api typecheck` completed successfully (2026-03-12).
- `pnpm --filter @afenda/core test -- src/erp/hr/core/__vitest_test__/rehire-employee.service.test.ts src/erp/hr/core/__vitest_test__/get-employee-profile.query.test.ts` passed again (4 tests, 2 files) on 2026-03-12.

### Known open items

- No Wave 3 blocking open items remain.
- Program-level sign-off should reference the latest consolidated HRM closure matrix.

---

# 1. `packages/core/src/erp/hr/core/dto/terminate-employment.dto.ts`

```ts
export interface TerminateEmploymentInput {
  employmentId: string;
  terminationDate: string;
  terminationReasonCode: string;
  comment?: string;
  startSeparationCase?: boolean;
}

export interface TerminateEmploymentOutput {
  employmentId: string;
  terminatedAt: string;
  separationCaseId?: string;
}
```

---

# 2. `packages/core/src/erp/hr/core/dto/rehire-employee.dto.ts`

```ts
export interface RehireEmployeeInput {
  employeeId: string;
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
}

export interface RehireEmployeeOutput {
  employeeId: string;
  employmentId: string;
  workAssignmentId: string;
  contractId?: string;
}
```

---

# 3. `packages/core/src/erp/hr/core/queries/get-employee-profile.query.ts`

```ts
export interface EmployeeProfileView {
  employeeId: string;
  employeeCode: string;
  personId: string;
  displayName: string;
  legalName: string;
  personalEmail: string | null;
  mobilePhone: string | null;
  workerType: string;
  currentStatus: string;

  employmentId: string | null;
  employmentNumber: string | null;
  employmentStatus: string | null;
  legalEntityId: string | null;
  hireDate: string | null;
  startDate: string | null;
  terminationDate: string | null;

  workAssignmentId: string | null;
  departmentId: string | null;
  positionId: string | null;
  jobId: string | null;
  gradeId: string | null;
  managerEmployeeId: string | null;
}

export interface GetEmployeeProfileQuery {
  execute(args: {
    orgId: string;
    employeeId: string;
  }): Promise<EmployeeProfileView | null>;
}
```

---

# 4. `packages/core/src/erp/hr/core/queries/list-employees.query.ts`

```ts
export interface EmployeeListItemView {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  workerType: string;
  currentStatus: string;
  employmentId: string | null;
  employmentStatus: string | null;
  legalEntityId: string | null;
  departmentId: string | null;
  positionId: string | null;
  managerEmployeeId: string | null;
}

export interface ListEmployeesQueryInput {
  orgId: string;
  search?: string;
  employmentStatus?: string;
  workerType?: string;
  limit?: number;
  offset?: number;
}

export interface ListEmployeesQueryResult {
  items: EmployeeListItemView[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListEmployeesQuery {
  execute(input: ListEmployeesQueryInput): Promise<ListEmployeesQueryResult>;
}
```

---

# 5. `packages/core/src/erp/hr/core/services/terminate-employment.service.ts`

```ts
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import type {
  TerminateEmploymentInput,
  TerminateEmploymentOutput,
} from "../dto/terminate-employment.dto";
import type { EmploymentRepository } from "../repositories/employment.repository";
import type { WorkAssignmentRepository } from "../repositories/work-assignment.repository";

export interface TerminateEmploymentDeps {
  db: {
    transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  };
  employmentRepository: EmploymentRepository;
  workAssignmentRepository: WorkAssignmentRepository;
  separationRepository?: {
    createCase: (args: {
      tx?: unknown;
      orgId: string;
      actorUserId: string;
      employmentId: string;
      separationType: string;
      lastWorkingDate: string;
      reasonCode: string;
      status?: string;
    }) => Promise<{ id: string }>;
  };
  auditService: {
    record: (args: {
      tx?: unknown;
      orgId: string;
      actorUserId: string;
      action: string;
      aggregateType: string;
      aggregateId: string;
      after: Record<string, unknown>;
      meta?: Record<string, unknown>;
    }) => Promise<void>;
  };
  outboxService: {
    enqueue: (args: {
      tx?: unknown;
      orgId: string;
      eventName: string;
      aggregateType: string;
      aggregateId: string;
      payload: Record<string, unknown>;
    }) => Promise<void>;
  };
}

export class TerminateEmploymentService {
  constructor(private readonly deps: TerminateEmploymentDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: TerminateEmploymentInput,
  ): Promise<HrmResult<TerminateEmploymentOutput>> {
    if (!input.employmentId || !input.terminationDate || !input.terminationReasonCode) {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "employmentId, terminationDate, and terminationReasonCode are required",
      );
    }

    const employment = await this.deps.employmentRepository.findById({
      orgId: ctx.orgId,
      employmentId: input.employmentId,
    });

    if (!employment) {
      return err(HRM_ERROR_CODES.CONFLICT, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    if (employment.employmentStatus === "terminated") {
      return err(HRM_ERROR_CODES.CONFLICT, "Employment already terminated", {
        employmentId: input.employmentId,
      });
    }

    if (!["active", "probation", "suspended", "inactive"].includes(employment.employmentStatus)) {
      return err(HRM_ERROR_CODES.CONFLICT, "Employment is not in a terminable state", {
        employmentId: input.employmentId,
        employmentStatus: employment.employmentStatus,
      });
    }

    const currentAssignment =
      await this.deps.workAssignmentRepository.findCurrentByEmploymentId({
        orgId: ctx.orgId,
        employmentId: input.employmentId,
      });

    try {
      return await this.deps.db.transaction(async (tx) => {
        await this.deps.employmentRepository.updateStatus({
          tx,
          orgId: ctx.orgId,
          employmentId: input.employmentId,
          employmentStatus: "terminated",
          terminationDate: input.terminationDate,
          terminationReasonCode: input.terminationReasonCode,
          actorUserId: ctx.actorUserId,
        });

        await this.deps.employmentRepository.insertStatusHistory({
          tx,
          orgId: ctx.orgId,
          actorUserId: ctx.actorUserId,
          employmentId: input.employmentId,
          oldStatus: employment.employmentStatus,
          newStatus: "terminated",
          changedAt: input.terminationDate,
          reasonCode: input.terminationReasonCode,
          comment: input.comment,
        });

        if (currentAssignment) {
          await this.deps.workAssignmentRepository.closeCurrentAssignment({
            tx,
            orgId: ctx.orgId,
            employmentId: input.employmentId,
            effectiveTo: input.terminationDate,
            actorUserId: ctx.actorUserId,
          });
        }

        let separationCaseId: string | undefined;
        if (input.startSeparationCase && this.deps.separationRepository) {
          const separationCase = await this.deps.separationRepository.createCase({
            tx,
            orgId: ctx.orgId,
            actorUserId: ctx.actorUserId,
            employmentId: input.employmentId,
            separationType: "termination",
            lastWorkingDate: input.terminationDate,
            reasonCode: input.terminationReasonCode,
            status: "open",
          });
          separationCaseId = separationCase.id;
        }

        const payload = {
          employmentId: input.employmentId,
          terminatedAt: input.terminationDate,
          terminationReasonCode: input.terminationReasonCode,
          separationCaseId,
        };

        await this.deps.auditService.record({
          tx,
          orgId: ctx.orgId,
          actorUserId: ctx.actorUserId,
          action: HRM_EVENTS.EMPLOYEE_TERMINATED,
          aggregateType: "hrm_employment",
          aggregateId: input.employmentId,
          after: payload,
          meta: {
            correlationId: ctx.correlationId,
            idempotencyKey: ctx.idempotencyKey,
          },
        });

        await this.deps.outboxService.enqueue({
          tx,
          orgId: ctx.orgId,
          eventName: HRM_EVENTS.EMPLOYEE_TERMINATED,
          aggregateType: "hrm_employment",
          aggregateId: input.employmentId,
          payload,
        });

        return ok<TerminateEmploymentOutput>({
          employmentId: input.employmentId,
          terminatedAt: input.terminationDate,
          separationCaseId,
        });
      });
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to terminate employment", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}
```

---

# 6. `packages/core/src/erp/hr/core/services/rehire-employee.service.ts`

```ts
import { randomUUID } from "node:crypto";
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import type {
  RehireEmployeeInput,
  RehireEmployeeOutput,
} from "../dto/rehire-employee.dto";
import type { EmployeeProfileRepository } from "../repositories/employee-profile.repository";
import type { EmploymentRepository } from "../repositories/employment.repository";
import type { WorkAssignmentRepository } from "../repositories/work-assignment.repository";

export interface RehireEmployeeDeps {
  db: {
    transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  };
  employeeProfileRepository: EmployeeProfileRepository;
  employmentRepository: EmploymentRepository;
  workAssignmentRepository: WorkAssignmentRepository;
  contractRepository?: {
    insert: (args: {
      tx?: unknown;
      orgId: string;
      actorUserId: string;
      employmentId: string;
      contractNumber: string;
      contractType: string;
      contractStartDate: string;
      contractEndDate?: string;
      documentFileId?: string;
    }) => Promise<{ id: string }>;
  };
  auditService: {
    record: (args: {
      tx?: unknown;
      orgId: string;
      actorUserId: string;
      action: string;
      aggregateType: string;
      aggregateId: string;
      after: Record<string, unknown>;
      meta?: Record<string, unknown>;
    }) => Promise<void>;
  };
  outboxService: {
    enqueue: (args: {
      tx?: unknown;
      orgId: string;
      eventName: string;
      aggregateType: string;
      aggregateId: string;
      payload: Record<string, unknown>;
    }) => Promise<void>;
  };
  codeGenerator: {
    nextEmploymentNumber: (orgId: string) => Promise<string>;
    nextContractNumber?: (orgId: string) => Promise<string>;
  };
}

export class RehireEmployeeService {
  constructor(private readonly deps: RehireEmployeeDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: RehireEmployeeInput,
  ): Promise<HrmResult<RehireEmployeeOutput>> {
    if (!input.employeeId || !input.legalEntityId || !input.hireDate || !input.startDate) {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "employeeId, legalEntityId, hireDate, and startDate are required",
      );
    }

    const employee = await this.deps.employeeProfileRepository.findById({
      orgId: ctx.orgId,
      employeeId: input.employeeId,
    });

    if (!employee) {
      return err(HRM_ERROR_CODES.CONFLICT, "Employee profile not found", {
        employeeId: input.employeeId,
      });
    }

    const hasActiveEmployment =
      await this.deps.employmentRepository.existsActiveEmploymentForEmployee({
        orgId: ctx.orgId,
        employeeId: input.employeeId,
      });

    if (hasActiveEmployment) {
      return err(
        HRM_ERROR_CODES.EMPLOYMENT_ALREADY_ACTIVE,
        "Employee already has an active employment",
        { employeeId: input.employeeId },
      );
    }

    try {
      return await this.deps.db.transaction(async (tx) => {
        const employmentNumber =
          await this.deps.codeGenerator.nextEmploymentNumber(ctx.orgId);

        const employment = await this.deps.employmentRepository.insert({
          tx,
          orgId: ctx.orgId,
          actorUserId: ctx.actorUserId,
          employeeId: input.employeeId,
          legalEntityId: input.legalEntityId,
          employmentNumber,
          employmentType: input.employmentType,
          hireDate: input.hireDate,
          startDate: input.startDate,
          probationEndDate: input.probationEndDate,
        });

        await this.deps.employeeProfileRepository.updatePrimaryEmploymentId({
          tx,
          orgId: ctx.orgId,
          employeeId: input.employeeId,
          primaryEmploymentId: employment.id,
        });

        await this.deps.employmentRepository.insertStatusHistory({
          tx,
          orgId: ctx.orgId,
          actorUserId: ctx.actorUserId,
          employmentId: employment.id,
          oldStatus: null,
          newStatus: "active",
          changedAt: input.startDate,
          reasonCode: "rehire",
          comment: "Rehired employee",
        });

        const workAssignment = await this.deps.workAssignmentRepository.insert({
          tx,
          orgId: ctx.orgId,
          actorUserId: ctx.actorUserId,
          employmentId: employment.id,
          legalEntityId: input.legalEntityId,
          businessUnitId: input.businessUnitId,
          departmentId: input.departmentId,
          costCenterId: input.costCenterId,
          locationId: input.locationId,
          positionId: input.positionId,
          jobId: input.jobId,
          gradeId: input.gradeId,
          managerEmployeeId: input.managerEmployeeId,
          workScheduleId: input.workScheduleId,
          employmentClass: input.employmentClass,
          fteRatio: input.fteRatio,
          effectiveFrom: input.startDate,
          changeReason: "rehire",
        });

        let contractId: string | undefined;
        if (input.contract && this.deps.contractRepository) {
          const contractNumber =
            input.contract.contractNumber ??
            (await this.deps.codeGenerator.nextContractNumber?.(ctx.orgId)) ??
            `CTR-${randomUUID()}`;

          const contract = await this.deps.contractRepository.insert({
            tx,
            orgId: ctx.orgId,
            actorUserId: ctx.actorUserId,
            employmentId: employment.id,
            contractNumber,
            contractType: input.contract.contractType,
            contractStartDate: input.contract.contractStartDate,
            contractEndDate: input.contract.contractEndDate,
            documentFileId: input.contract.documentFileId,
          });

          contractId = contract.id;
        }

        const payload = {
          employeeId: input.employeeId,
          employmentId: employment.id,
          workAssignmentId: workAssignment.id,
          contractId,
        };

        await this.deps.auditService.record({
          tx,
          orgId: ctx.orgId,
          actorUserId: ctx.actorUserId,
          action: HRM_EVENTS.EMPLOYEE_REHIRED,
          aggregateType: "hrm_employment",
          aggregateId: employment.id,
          after: payload,
          meta: {
            correlationId: ctx.correlationId,
            idempotencyKey: ctx.idempotencyKey,
          },
        });

        await this.deps.outboxService.enqueue({
          tx,
          orgId: ctx.orgId,
          eventName: HRM_EVENTS.EMPLOYEE_REHIRED,
          aggregateType: "hrm_employment",
          aggregateId: employment.id,
          payload,
        });

        return ok<RehireEmployeeOutput>({
          employeeId: input.employeeId,
          employmentId: employment.id,
          workAssignmentId: workAssignment.id,
          contractId,
        });
      });
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to rehire employee", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}
```

---

# 7. `packages/core/src/erp/hr/core/queries/get-employee-profile.query.ts`

```ts
import type { DbClient } from "@afenda/db";
import {
  hrmEmployeeProfiles,
  hrmEmploymentRecords,
  hrmPersons,
  hrmWorkAssignments,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import type {
  EmployeeProfileView,
} from "./get-employee-profile.query";

export async function getEmployeeProfile(
  db: DbClient,
  orgId: string,
  employeeId: string,
): Promise<EmployeeProfileView | null> {
  const rows = await db
      .select({
        employeeId: hrmEmployeeProfiles.id,
        employeeCode: hrmEmployeeProfiles.employeeCode,
        personId: hrmEmployeeProfiles.personId,
        displayName: hrmPersons.displayName,
        legalName: hrmPersons.legalName,
        personalEmail: hrmPersons.personalEmail,
        mobilePhone: hrmPersons.mobilePhone,
        workerType: hrmEmployeeProfiles.workerType,
        currentStatus: hrmEmployeeProfiles.currentStatus,
        employmentId: hrmEmploymentRecords.id,
        employmentNumber: hrmEmploymentRecords.employmentNumber,
        employmentStatus: hrmEmploymentRecords.employmentStatus,
        legalEntityId: hrmEmploymentRecords.legalEntityId,
        hireDate: hrmEmploymentRecords.hireDate,
        startDate: hrmEmploymentRecords.startDate,
        terminationDate: hrmEmploymentRecords.terminationDate,
        workAssignmentId: hrmWorkAssignments.id,
        departmentId: hrmWorkAssignments.departmentId,
        positionId: hrmWorkAssignments.positionId,
        jobId: hrmWorkAssignments.jobId,
        gradeId: hrmWorkAssignments.gradeId,
        managerEmployeeId: hrmWorkAssignments.managerEmployeeId,
      })
      .from(hrmEmployeeProfiles)
      .innerJoin(hrmPersons, and(eq(hrmPersons.orgId, hrmEmployeeProfiles.orgId), eq(hrmPersons.id, hrmEmployeeProfiles.personId)))
      .leftJoin(
        hrmEmploymentRecords,
        and(
          eq(hrmEmploymentRecords.orgId, hrmEmployeeProfiles.orgId),
          eq(hrmEmploymentRecords.id, hrmEmployeeProfiles.primaryEmploymentId),
        ),
      )
      .leftJoin(
        hrmWorkAssignments,
        and(
          eq(hrmWorkAssignments.orgId, hrmEmployeeProfiles.orgId),
          eq(hrmWorkAssignments.employmentId, hrmEmploymentRecords.id),
          eq(hrmWorkAssignments.isCurrent, true),
        ),
      )
      .where(and(eq(hrmEmployeeProfiles.orgId, orgId), eq(hrmEmployeeProfiles.id, employeeId)));

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    employeeId: row.employeeId,
    employeeCode: row.employeeCode,
    personId: row.personId,
    displayName: row.displayName ?? row.legalName,
    legalName: row.legalName,
    personalEmail: row.personalEmail,
    mobilePhone: row.mobilePhone,
    workerType: row.workerType,
    currentStatus: row.currentStatus,
    employmentId: row.employmentId ?? null,
    employmentNumber: row.employmentNumber ?? null,
    employmentStatus: row.employmentStatus ?? null,
    legalEntityId: row.legalEntityId ?? null,
    hireDate: row.hireDate ?? null,
    startDate: row.startDate ?? null,
    terminationDate: row.terminationDate ?? null,
    workAssignmentId: row.workAssignmentId ?? null,
    departmentId: row.departmentId ?? null,
    positionId: row.positionId ?? null,
    jobId: row.jobId ?? null,
    gradeId: row.gradeId ?? null,
    managerEmployeeId: row.managerEmployeeId ?? null,
  };
}
```

---

# 8. `packages/core/src/erp/hr/core/queries/list-employees.query.ts`

```ts
import type { DbClient } from "@afenda/db";
import {
  hrmEmployeeProfiles,
  hrmEmploymentRecords,
  hrmPersons,
  hrmWorkAssignments,
} from "@afenda/db";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import type {
  EmployeeListItemView,
  ListEmployeesQueryInput,
  ListEmployeesQueryResult,
} from "./list-employees.query";

export async function listEmployees(
  db: DbClient,
  input: ListEmployeesQueryInput,
): Promise<ListEmployeesQueryResult> {
  const limit = Math.min(input.limit ?? 25, 100);
  const offset = Math.max(input.offset ?? 0, 0);

  const filters = [eq(hrmEmployeeProfiles.orgId, input.orgId)];

  if (input.workerType) {
    filters.push(eq(hrmEmployeeProfiles.workerType, input.workerType as never));
  }

  if (input.search) {
    filters.push(
      or(
        ilike(hrmEmployeeProfiles.employeeCode, `%${input.search}%`),
        ilike(hrmPersons.displayName, `%${input.search}%`),
        ilike(hrmPersons.legalName, `%${input.search}%`),
      )!,
    );
  }

  if (input.employmentStatus) {
    filters.push(eq(hrmEmploymentRecords.employmentStatus, input.employmentStatus as never));
  }

  const items = await db
      .select({
        employeeId: hrmEmployeeProfiles.id,
        employeeCode: hrmEmployeeProfiles.employeeCode,
        displayName: hrmPersons.displayName,
        legalName: hrmPersons.legalName,
        workerType: hrmEmployeeProfiles.workerType,
        currentStatus: hrmEmployeeProfiles.currentStatus,
        employmentId: hrmEmploymentRecords.id,
        employmentStatus: hrmEmploymentRecords.employmentStatus,
        legalEntityId: hrmEmploymentRecords.legalEntityId,
        departmentId: hrmWorkAssignments.departmentId,
        positionId: hrmWorkAssignments.positionId,
        managerEmployeeId: hrmWorkAssignments.managerEmployeeId,
      })
      .from(hrmEmployeeProfiles)
      .innerJoin(hrmPersons, and(eq(hrmPersons.orgId, hrmEmployeeProfiles.orgId), eq(hrmPersons.id, hrmEmployeeProfiles.personId)))
      .leftJoin(
        hrmEmploymentRecords,
        and(
          eq(hrmEmploymentRecords.orgId, hrmEmployeeProfiles.orgId),
          eq(hrmEmploymentRecords.id, hrmEmployeeProfiles.primaryEmploymentId),
        ),
      )
      .leftJoin(
        hrmWorkAssignments,
        and(
          eq(hrmWorkAssignments.orgId, hrmEmployeeProfiles.orgId),
          eq(hrmWorkAssignments.employmentId, hrmEmploymentRecords.id),
          eq(hrmWorkAssignments.isCurrent, true),
        ),
      )
      .where(and(...filters))
      .limit(limit)
      .offset(offset);

  const countRows = await db
      .select({ total: sql<number>`count(*)` })
      .from(hrmEmployeeProfiles)
      .innerJoin(hrmPersons, and(eq(hrmPersons.orgId, hrmEmployeeProfiles.orgId), eq(hrmPersons.id, hrmEmployeeProfiles.personId)))
      .leftJoin(
        hrmEmploymentRecords,
        and(
          eq(hrmEmploymentRecords.orgId, hrmEmployeeProfiles.orgId),
          eq(hrmEmploymentRecords.id, hrmEmployeeProfiles.primaryEmploymentId),
        ),
      )
      .where(and(...filters));

  return {
    items: items.map((row): EmployeeListItemView => ({
      employeeId: row.employeeId,
      employeeCode: row.employeeCode,
      displayName: row.displayName ?? row.legalName,
      workerType: row.workerType,
      currentStatus: row.currentStatus,
      employmentId: row.employmentId ?? null,
      employmentStatus: row.employmentStatus ?? null,
      legalEntityId: row.legalEntityId ?? null,
      departmentId: row.departmentId ?? null,
      positionId: row.positionId ?? null,
      managerEmployeeId: row.managerEmployeeId ?? null,
    })),
    total: Number(countRows[0]?.total ?? 0),
    limit,
    offset,
  };
}
```

---

# 9. `apps/api/src/routes/erp/hr/terminate-employment.ts`

```ts
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { terminateEmployment } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const TerminateEmploymentBodySchema = z.object({
  employmentId: z.string().uuid(),
  terminationDate: z.string(),
  terminationReasonCode: z.string().min(1).max(50),
  comment: z.string().max(1000).optional(),
});

const TerminateEmploymentResponseSchema = makeSuccessSchema(
  z.object({
    employmentId: z.string().uuid(),
    previousStatus: z.string(),
    currentStatus: z.string(),
  }),
);

export async function hrTerminateEmploymentRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employments/terminate",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Terminate employment (phase 1 scaffold route).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: TerminateEmploymentBodySchema,
        response: {
          200: TerminateEmploymentResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await terminateEmployment(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_EMPLOYMENT_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_INVALID_EMPLOYMENT_STATE"
              ? 409
              : 400;

        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );
}
```

---

# 10. `apps/api/src/routes/erp/hr/get-employee-profile.ts`

```ts
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { getEmployeeProfile } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const EmployeeProfileParamsSchema = z.object({
  employeeId: z.string().uuid(),
});

const EmployeeProfileResponseSchema = makeSuccessSchema(
  z.object({
    employeeId: z.string().uuid(),
    employeeCode: z.string(),
    personId: z.string().uuid(),
    displayName: z.string(),
    legalName: z.string(),
    personalEmail: z.string().nullable(),
    mobilePhone: z.string().nullable(),
    currentStatus: z.string(),
    workerType: z.string(),
    employmentId: z.string().uuid().nullable(),
    employmentNumber: z.string().nullable(),
    employmentStatus: z.string().nullable(),
    legalEntityId: z.string().uuid().nullable(),
    hireDate: z.string().nullable(),
    startDate: z.string().nullable(),
    terminationDate: z.string().nullable(),
    workAssignmentId: z.string().uuid().nullable(),
    departmentId: z.string().uuid().nullable(),
    positionId: z.string().uuid().nullable(),
    jobId: z.string().uuid().nullable(),
    gradeId: z.string().uuid().nullable(),
    managerEmployeeId: z.string().uuid().nullable(),
  }),
);

export async function hrGetEmployeeProfileRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/employees/:employeeId",
    {
      schema: {
        description: "Get employee profile (phase 1 scaffold route).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: EmployeeProfileParamsSchema,
        response: {
          200: EmployeeProfileResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const profile = await getEmployeeProfile(app.db, orgId, req.params.employeeId);

      if (!profile) {
        return reply.status(404).send({
          error: {
            code: "HRM_EMPLOYEE_NOT_FOUND",
            message: "Employee profile not found",
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: profile,
        correlationId: req.correlationId,
      });
    },
  );
}
```

---

# 11. `apps/api/src/routes/erp/hr/list-employees.ts`

```ts
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { listEmployees } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ListEmployeesQuerySchema = z.object({
  search: z.string().optional(),
  employmentStatus: z.string().optional(),
  workerType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const ListEmployeesResponseSchema = makeSuccessSchema(
  z.object({
    items: z.array(
      z.object({
        employeeId: z.string().uuid(),
        employeeCode: z.string(),
        displayName: z.string(),
        workerType: z.string(),
        currentStatus: z.string(),
        employmentId: z.string().uuid().nullable(),
        employmentStatus: z.string().nullable(),
        legalEntityId: z.string().uuid().nullable(),
        departmentId: z.string().uuid().nullable(),
        positionId: z.string().uuid().nullable(),
        managerEmployeeId: z.string().uuid().nullable(),
      }),
    ),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  }),
);

export async function hrListEmployeesRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/employees",
    {
      schema: {
        description: "List employees (phase 1 scaffold route).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: ListEmployeesQuerySchema,
        response: {
          200: ListEmployeesResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await listEmployees(app.db, {
        orgId,
        ...req.query,
      });

      return reply.status(200).send({
        data: result,
        correlationId: req.correlationId,
      });
    },
  );
}
```

---

# 12. `apps/api/src/index.ts` (route registration)

```ts
import type { FastifyInstance } from "fastify";
import { hrCreatePersonRoutes } from "./routes/erp/hr/create-person.js";
import { hrHireEmployeeRoutes } from "./routes/erp/hr/hire-employee.js";
import { hrTransferEmployeeRoutes } from "./routes/erp/hr/transfer-employee.js";
import { hrTerminateEmploymentRoutes } from "./routes/erp/hr/terminate-employment.js";
import { hrGetEmployeeProfileRoutes } from "./routes/erp/hr/get-employee-profile.js";
import { hrListEmployeesRoutes } from "./routes/erp/hr/list-employees.js";

export async function registerHrmRoutes(app: FastifyInstance) {
  await app.register(hrCreatePersonRoutes, { prefix: "/v1" });
  await app.register(hrHireEmployeeRoutes, { prefix: "/v1" });
  await app.register(hrTransferEmployeeRoutes, { prefix: "/v1" });
  await app.register(hrTerminateEmploymentRoutes, { prefix: "/v1" });
  await app.register(hrGetEmployeeProfileRoutes, { prefix: "/v1" });
  await app.register(hrListEmployeesRoutes, { prefix: "/v1" });
}
```

---

# 13. What is still intentionally incomplete

Wave 3 scoped implementation is now functionally complete for:

- terminate + rehire lifecycle command path
- employee profile/list read models with enrichment
- route coverage for lifecycle + profile/list endpoints
- targeted tests for lifecycle guards and read-model behavior

Remaining items are now program-level (outside this wave's narrow scope):

- Wave 1 web HR delivery
- Seed data implementation
- Full-suite and cross-wave invariant test closure

---

# 14. Next exact batch to build

The next correct batch is closure-focused across waves:

```text
apps/web/src/app/(erp)/hr/*
scripts/seed-hrm-*.ts (or project seed location)
packages/core/src/erp/hr/**/__vitest_test__/*
docs/hrm/hrm-wave1.scaffold.md
```

Recommended order:

```text
1. Complete Web HR screens (Wave 1 R1)
2. Implement and verify HR seeders (Wave 1 R2)
3. Expand invariant/integration tests and run full checks (Wave 1 R3/R4)
```

That gives AFENDA the full **Phase 1 business loop**:

```text
person
→ hire
→ transfer
→ terminate
→ rehire
→ requisition
→ offer
→ onboarding
→ separation
```

I can continue with the next drop-in batch for **`hrm-recruitment.ts` + `hrm-onboarding.ts` + first recruitment services**.
