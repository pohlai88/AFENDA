import type { DbClient } from "@afenda/db";
import { auditLog, hrmEmploymentRecords, hrmWorkAssignments, outboxEvent } from "@afenda/db";
import { and, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { TransferEmployeeInput, TransferEmployeeOutput } from "../dto/transfer-employee.dto";

export interface TransferEmployeeDeps {
  run: (ctx: HrmCommandContext, input: TransferEmployeeInput) => Promise<TransferEmployeeOutput>;
}

export class TransferEmployeeService {
  constructor(private readonly deps: TransferEmployeeDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: TransferEmployeeInput,
  ): Promise<HrmResult<TransferEmployeeOutput>> {
    if (!input.employmentId || !input.effectiveFrom || !input.legalEntityId) {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "employmentId, effectiveFrom, and legalEntityId are required",
      );
    }

    try {
      const data = await this.deps.run(ctx, input);
      return ok(data);
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to transfer employee", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}

export async function transferEmployee(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: TransferEmployeeInput,
): Promise<HrmResult<TransferEmployeeOutput>> {
  if (!input.employmentId || !input.effectiveFrom || !input.legalEntityId) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, effectiveFrom, and legalEntityId are required",
    );
  }

  try {
    const [employment] = await db
      .select({ id: hrmEmploymentRecords.id, status: hrmEmploymentRecords.employmentStatus })
      .from(hrmEmploymentRecords)
      .where(and(eq(hrmEmploymentRecords.orgId, orgId), eq(hrmEmploymentRecords.id, input.employmentId)));

    if (!employment) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    if (!["active", "probation", "suspended"].includes(employment.status)) {
      return err(
        HRM_ERROR_CODES.INVALID_EMPLOYMENT_STATE,
        "Employment is not in a transferable state",
        {
          employmentId: input.employmentId,
          employmentStatus: employment.status,
        },
      );
    }

    const [currentAssignment] = await db
      .select({ id: hrmWorkAssignments.id })
      .from(hrmWorkAssignments)
      .where(
        and(
          eq(hrmWorkAssignments.orgId, orgId),
          eq(hrmWorkAssignments.employmentId, input.employmentId),
          eq(hrmWorkAssignments.isCurrent, true),
        ),
      );

    if (!currentAssignment) {
      return err(HRM_ERROR_CODES.WORK_ASSIGNMENT_NOT_FOUND, "Current work assignment not found", {
        employmentId: input.employmentId,
      });
    }

    const overlappingAssignments = await db
      .select({ id: hrmWorkAssignments.id })
      .from(hrmWorkAssignments)
      .where(
        and(
          eq(hrmWorkAssignments.orgId, orgId),
          eq(hrmWorkAssignments.employmentId, input.employmentId),
          ne(hrmWorkAssignments.id, currentAssignment.id),
          lte(hrmWorkAssignments.effectiveFrom, sql`${input.effectiveFrom}::timestamptz`),
          or(
            isNull(hrmWorkAssignments.effectiveTo),
            gte(hrmWorkAssignments.effectiveTo, sql`${input.effectiveFrom}::timestamptz`),
          ),
        ),
      );

    if (overlappingAssignments.length > 0) {
      return err(
        HRM_ERROR_CODES.WORK_ASSIGNMENT_OVERLAP,
        "Transfer would create overlapping work assignments",
        {
          employmentId: input.employmentId,
          effectiveFrom: input.effectiveFrom,
        },
      );
    }

    const data = await db.transaction(async (tx) => {
      await tx
        .update(hrmWorkAssignments)
        .set({
          effectiveTo: sql`${input.effectiveFrom}::timestamptz`,
          isCurrent: false,
          assignmentStatus: "historical",
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmWorkAssignments.orgId, orgId), eq(hrmWorkAssignments.id, currentAssignment.id)));

      const [newAssignment] = await tx
        .insert(hrmWorkAssignments)
        .values({
          orgId,
          employmentId: input.employmentId,
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
          effectiveFrom: sql`${input.effectiveFrom}::timestamptz`,
          changeReason: input.changeReason,
          isCurrent: true,
        })
        .returning({ id: hrmWorkAssignments.id });

      if (!newAssignment) {
        throw new Error("Failed to insert new work assignment");
      }

      const payload = {
        employmentId: input.employmentId,
        previousWorkAssignmentId: currentAssignment.id,
        newWorkAssignmentId: newAssignment.id,
        effectiveFrom: input.effectiveFrom,
        legalEntityId: input.legalEntityId,
        businessUnitId: input.businessUnitId ?? null,
        departmentId: input.departmentId ?? null,
        positionId: input.positionId ?? null,
        jobId: input.jobId ?? null,
        gradeId: input.gradeId ?? null,
        changeReason: input.changeReason,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.EMPLOYEE_TRANSFERRED,
        entityType: "hrm_employment",
        entityId: input.employmentId,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.EMPLOYEE_TRANSFERRED",
        version: "1",
        correlationId,
        payload,
      });

      return {
        previousWorkAssignmentId: currentAssignment.id,
        newWorkAssignmentId: newAssignment.id,
      };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to transfer employee", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
