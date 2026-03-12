import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmployeeProfiles,
  hrmEmploymentContracts,
  hrmEmploymentRecords,
  hrmEmploymentStatusHistory,
  hrmWorkAssignments,
  outboxEvent,
} from "@afenda/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { RehireEmployeeInput, RehireEmployeeOutput } from "../dto/rehire-employee.dto";
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

    const activeEmploymentExists =
      await this.deps.employmentRepository.existsActiveEmploymentForEmployee({
        orgId: ctx.orgId,
        employeeId: input.employeeId,
      });

    if (activeEmploymentExists) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_ALREADY_ACTIVE, "Employee already has active employment", {
        employeeId: input.employeeId,
      });
    }

    try {
      return await this.deps.db.transaction(async (tx) => {
        const employmentNumber = await this.deps.codeGenerator.nextEmploymentNumber(ctx.orgId);

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

        const assignment = await this.deps.workAssignmentRepository.insert({
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
          changeReason: input.changeReason ?? "rehire",
        });

        await this.deps.employeeProfileRepository.updatePrimaryEmploymentId({
          tx,
          orgId: ctx.orgId,
          employeeId: input.employeeId,
          primaryEmploymentId: employment.id,
        });

        const payload = {
          employeeId: input.employeeId,
          employmentId: employment.id,
          workAssignmentId: assignment.id,
          contractId: undefined,
        };

        await this.deps.auditService.record({
          tx,
          orgId: ctx.orgId,
          actorUserId: ctx.actorUserId,
          action: HRM_EVENTS.EMPLOYEE_REHIRED,
          aggregateType: "hrm_employee",
          aggregateId: input.employeeId,
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
          aggregateType: "hrm_employee",
          aggregateId: input.employeeId,
          payload,
        });

        return ok<RehireEmployeeOutput>({
          employeeId: input.employeeId,
          employmentId: employment.id,
          workAssignmentId: assignment.id,
          contractId: undefined,
        });
      });
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to rehire employee", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}

function buildEmploymentNumber(): string {
  return `EMR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function buildContractNumber(): string {
  return `CTR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function rehireEmployee(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: RehireEmployeeInput,
): Promise<HrmResult<RehireEmployeeOutput>> {
  if (!input.employeeId || !input.legalEntityId || !input.hireDate || !input.startDate) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employeeId, legalEntityId, hireDate, and startDate are required",
    );
  }

  try {
    const [employee] = await db
      .select({ id: hrmEmployeeProfiles.id })
      .from(hrmEmployeeProfiles)
      .where(and(eq(hrmEmployeeProfiles.orgId, orgId), eq(hrmEmployeeProfiles.id, input.employeeId)));

    if (!employee) {
      return err(HRM_ERROR_CODES.EMPLOYEE_NOT_FOUND, "Employee profile not found", {
        employeeId: input.employeeId,
      });
    }

    const activeEmployment = await db
      .select({ id: hrmEmploymentRecords.id })
      .from(hrmEmploymentRecords)
      .where(
        and(
          eq(hrmEmploymentRecords.orgId, orgId),
          eq(hrmEmploymentRecords.employeeId, input.employeeId),
          inArray(hrmEmploymentRecords.employmentStatus, ["active", "probation", "suspended"]),
        ),
      );

    if (activeEmployment[0]) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_ALREADY_ACTIVE, "Employee already has active employment", {
        employeeId: input.employeeId,
      });
    }

    const employmentNumber = buildEmploymentNumber();

    const data = await db.transaction(async (tx) => {
      const [employment] = await tx
        .insert(hrmEmploymentRecords)
        .values({
          orgId,
          employeeId: input.employeeId,
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
          changeReason: input.changeReason ?? "rehire",
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
          currentStatus: "active",
          primaryLegalEntityId: input.legalEntityId,
          primaryEmploymentId: employment.id,
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmEmployeeProfiles.orgId, orgId), eq(hrmEmployeeProfiles.id, input.employeeId)));

      await tx.insert(hrmEmploymentStatusHistory).values({
        orgId,
        employmentId: employment.id,
        oldStatus: null,
        newStatus: "active",
        changedAt: input.startDate,
        changedBy: actorPrincipalId ?? null,
        reasonCode: "rehire",
        metadata: { comment: "Rehired employee" },
      });

      const payload = {
        employeeId: input.employeeId,
        employmentId: employment.id,
        workAssignmentId: assignment.id,
        contractId,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.EMPLOYEE_REHIRED,
        entityType: "hrm_employment",
        entityId: employment.id,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.EMPLOYEE_REHIRED",
        version: "1",
        correlationId,
        payload,
      });

      return {
        employeeId: input.employeeId,
        employmentId: employment.id,
        workAssignmentId: assignment.id,
        contractId,
      };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to rehire employee", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}