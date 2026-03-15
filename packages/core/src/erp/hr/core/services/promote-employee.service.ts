import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmploymentRecords,
  hrmWorkAssignments,
  outboxEvent,
} from "@afenda/db";
import { and, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface PromoteEmployeeInput {
  employmentId: string;
  effectiveFrom: string;
  gradeId?: string;
  positionId?: string;
  jobId?: string;
  promotionType?: "merit" | "acting" | "temporary" | "career-path";
  changeReason: string;
}

export interface PromoteEmployeeOutput {
  employmentId: string;
  previousWorkAssignmentId: string;
  newWorkAssignmentId: string;
}

export async function promoteEmployee(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  performedAt: string,
  input: PromoteEmployeeInput,
): Promise<HrmResult<PromoteEmployeeOutput>> {
  if (!input.employmentId || !input.effectiveFrom || !input.changeReason) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, effectiveFrom, and changeReason are required",
    );
  }

  if (!input.gradeId && !input.positionId && !input.jobId) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "At least one of gradeId, positionId, or jobId is required for promotion",
    );
  }

  try {
    const data = await db.transaction(async (tx) => {
      const [employment] = await tx
        .select({ id: hrmEmploymentRecords.id, status: hrmEmploymentRecords.employmentStatus })
        .from(hrmEmploymentRecords)
        .where(
          and(
            eq(hrmEmploymentRecords.orgId, orgId),
            eq(hrmEmploymentRecords.id, input.employmentId),
          ),
        )
        .for("update");

      if (!employment) {
        throw new Error("EMPLOYMENT_NOT_FOUND");
      }

      if (!["active", "probation", "suspended"].includes(employment.status)) {
        throw new Error("INVALID_EMPLOYMENT_STATE");
      }

      const [currentAssignment] = await tx
        .select({
          id: hrmWorkAssignments.id,
          legalEntityId: hrmWorkAssignments.legalEntityId,
          businessUnitId: hrmWorkAssignments.businessUnitId,
          departmentId: hrmWorkAssignments.departmentId,
          costCenterId: hrmWorkAssignments.costCenterId,
          positionId: hrmWorkAssignments.positionId,
          jobId: hrmWorkAssignments.jobId,
          gradeId: hrmWorkAssignments.gradeId,
          managerEmployeeId: hrmWorkAssignments.managerEmployeeId,
          fteRatio: hrmWorkAssignments.fteRatio,
        })
        .from(hrmWorkAssignments)
        .where(
          and(
            eq(hrmWorkAssignments.orgId, orgId),
            eq(hrmWorkAssignments.employmentId, input.employmentId),
            eq(hrmWorkAssignments.isCurrent, true),
          ),
        );

      if (!currentAssignment) {
        throw new Error("WORK_ASSIGNMENT_NOT_FOUND");
      }

      const previousGradeId = currentAssignment.gradeId ?? undefined;
      const previousPositionId = currentAssignment.positionId ?? undefined;
      const previousJobId = currentAssignment.jobId ?? undefined;

      const gradeChanged = input.gradeId !== undefined && input.gradeId !== previousGradeId;
      const positionChanged = input.positionId !== undefined && input.positionId !== previousPositionId;
      const jobChanged = input.jobId !== undefined && input.jobId !== previousJobId;

      if (!gradeChanged && !positionChanged && !jobChanged) {
        throw new Error("PROMOTION_NO_CHANGE");
      }

      const overlappingAssignments = await tx
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
        throw new Error("WORK_ASSIGNMENT_OVERLAP");
      }

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
          legalEntityId: currentAssignment.legalEntityId,
          businessUnitId: currentAssignment.businessUnitId,
          departmentId: currentAssignment.departmentId,
          costCenterId: currentAssignment.costCenterId,
          positionId: input.positionId ?? currentAssignment.positionId,
          jobId: input.jobId ?? currentAssignment.jobId,
          gradeId: input.gradeId ?? currentAssignment.gradeId,
          managerEmployeeId: currentAssignment.managerEmployeeId,
          fteRatio: currentAssignment.fteRatio,
          assignmentStatus: "active",
          effectiveFrom: sql`${input.effectiveFrom}::timestamptz`,
          changeReason: input.changeReason,
          isCurrent: true,
        })
        .returning({ id: hrmWorkAssignments.id });

      if (!newAssignment) {
        throw new Error("Failed to insert new work assignment");
      }

      const today = new Date().toISOString().slice(0, 10);
      const retroactive = input.effectiveFrom < today;

      const payload = {
        employmentId: input.employmentId,
        previousWorkAssignmentId: currentAssignment.id,
        newWorkAssignmentId: newAssignment.id,
        previousGradeId: previousGradeId ?? null,
        gradeId: input.gradeId ?? null,
        previousPositionId: previousPositionId ?? null,
        positionId: input.positionId ?? null,
        previousJobId: previousJobId ?? null,
        jobId: input.jobId ?? null,
        promotionType: input.promotionType ?? null,
        effectiveFrom: input.effectiveFrom,
        changeReason: input.changeReason,
        retroactive,
        actorId: actorPrincipalId ?? null,
        performedAt,
        correlationId,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.EMPLOYEE_PROMOTED,
        entityType: "hrm_employment",
        entityId: input.employmentId,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.EMPLOYEE_PROMOTED",
        version: "1",
        correlationId,
        payload,
      });

      return {
        employmentId: input.employmentId,
        previousWorkAssignmentId: currentAssignment.id,
        newWorkAssignmentId: newAssignment.id,
      };
    });

    return ok(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown_error";
    if (msg === "EMPLOYMENT_NOT_FOUND") {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }
    if (msg === "WORK_ASSIGNMENT_NOT_FOUND") {
      return err(HRM_ERROR_CODES.WORK_ASSIGNMENT_NOT_FOUND, "Current work assignment not found", {
        employmentId: input.employmentId,
      });
    }
    if (msg === "INVALID_EMPLOYMENT_STATE") {
      return err(
        HRM_ERROR_CODES.INVALID_EMPLOYMENT_STATE,
        "Employment is not in a promotable state",
        { employmentId: input.employmentId },
      );
    }
    if (msg === "PROMOTION_NO_CHANGE") {
      return err(
        HRM_ERROR_CODES.PROMOTION_NO_CHANGE,
        "At least one of gradeId, positionId, or jobId must differ from current values",
      );
    }
    if (msg === "WORK_ASSIGNMENT_OVERLAP") {
      return err(
        HRM_ERROR_CODES.WORK_ASSIGNMENT_OVERLAP,
        "Promotion would create overlapping work assignments",
        { employmentId: input.employmentId, effectiveFrom: input.effectiveFrom },
      );
    }
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to promote employee", {
      cause: msg,
    });
  }
}
