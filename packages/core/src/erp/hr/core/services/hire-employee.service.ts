import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmployeeProfiles,
  hrmEmploymentContracts,
  hrmEmploymentRecords,
  hrmEmploymentStatusHistory,
  hrmPersons,
  hrmWorkAssignments,
  outboxEvent,
} from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS, type HrmDomainEvent } from "../../shared/events/hrm-events";
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { HireEmployeeInput, HireEmployeeOutput } from "../dto/hire-employee.dto";

export interface HireEmployeeDeps {
  // Placeholder dependency contract for phase 1 wiring.
  run: (ctx: HrmCommandContext, input: HireEmployeeInput) => Promise<HireEmployeeOutput>;
}

export class HireEmployeeService {
  constructor(private readonly deps: HireEmployeeDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: HireEmployeeInput,
  ): Promise<HrmResult<HireEmployeeOutput>> {
    if (!input.personId) {
      return err(HRM_ERROR_CODES.INVALID_INPUT, "personId is required");
    }
    if (!input.legalEntityId) {
      return err(HRM_ERROR_CODES.LEGAL_ENTITY_REQUIRED, "legalEntityId is required");
    }

    try {
      const data = await this.deps.run(ctx, input);
      const _event: HrmDomainEvent = {
        eventName: HRM_EVENTS.EMPLOYEE_HIRED,
        orgId: ctx.orgId,
        aggregateType: "hrm_employment",
        aggregateId: data.employmentId,
        payload: data as unknown as Record<string, unknown>,
        occurredAt: ctx.now?.toISOString() ?? "",
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId ?? null,
        idempotencyKey: ctx.idempotencyKey,
      };
      return ok(data);
    } catch (cause) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to hire employee", {
        cause: cause instanceof Error ? cause.message : "unknown_error",
      });
    }
  }
}

function buildEmployeeCode(): string {
  return `EMP-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function buildEmploymentNumber(): string {
  return `EMR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function buildContractNumber(): string {
  return `CTR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function hireEmployee(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: HireEmployeeInput,
): Promise<HrmResult<HireEmployeeOutput>> {
  if (!input.personId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "personId is required");
  }
  if (!input.legalEntityId) {
    return err(HRM_ERROR_CODES.LEGAL_ENTITY_REQUIRED, "legalEntityId is required");
  }

  try {
    const [person] = await db
      .select({ id: hrmPersons.id })
      .from(hrmPersons)
      .where(and(eq(hrmPersons.orgId, orgId), eq(hrmPersons.id, input.personId)));

    if (!person) {
      return err(HRM_ERROR_CODES.PERSON_NOT_FOUND, "Person not found", {
        personId: input.personId,
      });
    }

    const existingEmployee = await db
      .select({ id: hrmEmployeeProfiles.id })
      .from(hrmEmployeeProfiles)
      .where(and(eq(hrmEmployeeProfiles.orgId, orgId), eq(hrmEmployeeProfiles.personId, input.personId)));

    if (existingEmployee[0]) {
      return err(HRM_ERROR_CODES.EMPLOYEE_ALREADY_EXISTS, "Employee profile already exists", {
        personId: input.personId,
      });
    }

    const employeeCode = input.employeeCode ?? buildEmployeeCode();
    const employmentNumber = buildEmploymentNumber();

    const data = await db.transaction(async (tx) => {
      const [employee] = await tx
        .insert(hrmEmployeeProfiles)
        .values({
          orgId,
          personId: input.personId,
          employeeCode,
          workerType: input.workerType,
          currentStatus: "active",
          primaryLegalEntityId: input.legalEntityId,
        })
        .returning({ id: hrmEmployeeProfiles.id });

      if (!employee) {
        throw new Error("Failed to insert employee profile");
      }

      const [employment] = await tx
        .insert(hrmEmploymentRecords)
        .values({
          orgId,
          employeeId: employee.id,
          legalEntityId: input.legalEntityId,
          employmentNumber,
          employmentType: input.employmentType,
          hireDate: input.hireDate,
          startDate: input.startDate,
          probationEndDate: input.probationEndDate,
          employmentStatus: "active",
          payrollStatus: "inactive",
          isPrimary: true,
        })
        .returning({ id: hrmEmploymentRecords.id });

      if (!employment) {
        throw new Error("Failed to insert employment record");
      }

      const [assignment] = await tx
        .insert(hrmWorkAssignments)
        .values({
          orgId,
          employmentId: employment.id,
          legalEntityId: input.legalEntityId,
          businessUnitId: input.businessUnitId,
          departmentId: input.departmentId,
          costCenterId: input.costCenterId,
          positionId: input.positionId,
          jobId: input.jobId,
          gradeId: input.gradeId,
          managerEmployeeId: input.managerEmployeeId,
          fteRatio: input.fteRatio ?? "1.0000",
          assignmentStatus: "active",
          effectiveFrom: sql`${input.startDate}::timestamptz`,
          changeReason: "hire",
          isCurrent: true,
        })
        .returning({ id: hrmWorkAssignments.id });

      if (!assignment) {
        throw new Error("Failed to insert work assignment");
      }

      let contractId: string | undefined;
      if (input.contract) {
        const [contract] = await tx
          .insert(hrmEmploymentContracts)
          .values({
            orgId,
            employmentId: employment.id,
            contractNumber: input.contract.contractNumber ?? buildContractNumber(),
            contractType: input.contract.contractType,
            contractStartDate: input.contract.contractStartDate,
            contractEndDate: input.contract.contractEndDate,
            documentFileId: input.contract.documentFileId,
          })
          .returning({ id: hrmEmploymentContracts.id });

        contractId = contract?.id;
      }

      await tx
        .update(hrmEmployeeProfiles)
        .set({
          primaryEmploymentId: employment.id,
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmEmployeeProfiles.orgId, orgId), eq(hrmEmployeeProfiles.id, employee.id)));

      await tx.insert(hrmEmploymentStatusHistory).values({
        orgId,
        employmentId: employment.id,
        oldStatus: null,
        newStatus: "active",
        changedAt: input.startDate,
        changedBy: actorPrincipalId ?? null,
        reasonCode: "hire",
      });

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.EMPLOYEE_HIRED,
        entityType: "hrm_employment",
        entityId: employment.id,
        correlationId,
        details: {
          employeeId: employee.id,
          employmentId: employment.id,
          workAssignmentId: assignment.id,
          contractId,
          personId: input.personId,
          employeeCode,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.EMPLOYEE_HIRED",
        version: "1",
        correlationId,
        payload: {
          employeeId: employee.id,
          employmentId: employment.id,
          workAssignmentId: assignment.id,
          contractId,
          personId: input.personId,
          employeeCode,
        },
      });

      return {
        employeeId: employee.id,
        employmentId: employment.id,
        workAssignmentId: assignment.id,
        contractId,
      };
    });

    return ok(data);
  } catch (cause) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to hire employee", {
      cause: cause instanceof Error ? cause.message : "unknown_error",
    });
  }
}
