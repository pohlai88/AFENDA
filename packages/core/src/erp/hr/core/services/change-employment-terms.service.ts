import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmploymentContracts,
  hrmEmploymentRecords,
  hrmWorkAssignments,
  outboxEvent,
} from "@afenda/db";
import { and, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface ChangeEmploymentTermsInput {
  employmentId: string;
  effectiveFrom: string;
  changeReason?: string;
  fteRatio?: string;
  probationEndDate?: string;
  employmentType?: "permanent" | "contract" | "temporary" | "internship" | "outsourced";
  contract?: {
    contractNumber: string;
    contractType: string;
    contractStartDate: string;
    contractEndDate?: string;
    documentFileId?: string;
  };
}

export interface ChangeEmploymentTermsOutput {
  employmentId: string;
  contractId?: string;
}

export async function changeEmploymentTerms(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  performedAt: string,
  input: ChangeEmploymentTermsInput,
): Promise<HrmResult<ChangeEmploymentTermsOutput>> {
  if (!input.employmentId || !input.effectiveFrom) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId and effectiveFrom are required",
    );
  }

  if (!input.fteRatio && !input.probationEndDate && !input.employmentType) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "At least one of fteRatio, probationEndDate, or employmentType is required",
    );
  }

  if (input.employmentType === "contract" && !input.contract) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "contract is required when employmentType is 'contract'",
    );
  }

  if (
    input.probationEndDate &&
    input.effectiveFrom &&
    input.probationEndDate < input.effectiveFrom
  ) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "probationEndDate must be >= effectiveFrom",
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [employment] = await tx
        .select({
          id: hrmEmploymentRecords.id,
          status: hrmEmploymentRecords.employmentStatus,
          probationEndDate: hrmEmploymentRecords.probationEndDate,
          employmentType: hrmEmploymentRecords.employmentType,
        })
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
      let contractId: string | undefined;
      let previousFteRatio: string | null = null;

      if (input.fteRatio) {
        const [currentAssignment] = await tx
          .select()
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
        previousFteRatio = currentAssignment.fteRatio;

        const overlapping = await tx
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

        if (overlapping.length > 0) {
          throw new Error("OVERLAPPING_ASSIGNMENTS");
        }

        await tx
          .update(hrmWorkAssignments)
          .set({
            effectiveTo: sql`${input.effectiveFrom}::timestamptz`,
            isCurrent: false,
            assignmentStatus: "historical",
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(hrmWorkAssignments.orgId, orgId),
              eq(hrmWorkAssignments.id, currentAssignment.id),
            ),
          );

        await tx.insert(hrmWorkAssignments).values({
          orgId,
          employmentId: input.employmentId,
          legalEntityId: currentAssignment.legalEntityId,
          businessUnitId: currentAssignment.businessUnitId,
          departmentId: currentAssignment.departmentId,
          costCenterId: currentAssignment.costCenterId,
          positionId: currentAssignment.positionId,
          jobId: currentAssignment.jobId,
          gradeId: currentAssignment.gradeId,
          managerEmployeeId: currentAssignment.managerEmployeeId,
          fteRatio: input.fteRatio,
          assignmentStatus: "active",
          effectiveFrom: sql`${input.effectiveFrom}::timestamptz`,
          changeReason: input.changeReason ?? null,
          isCurrent: true,
        });
      }

      const employmentUpdates: Record<string, unknown> = {};
      if (input.probationEndDate !== undefined) {
        employmentUpdates.probationEndDate = input.probationEndDate;
      }
      if (input.employmentType !== undefined) {
        employmentUpdates.employmentType = input.employmentType;
      }

      const employmentTypeChanged = input.employmentType !== undefined && input.employmentType !== employment.employmentType;
      const fteRatioChanged = input.fteRatio !== undefined;
      const requiresImpactAssessment = employmentTypeChanged || fteRatioChanged;
      if (requiresImpactAssessment) {
        employmentUpdates.impactAssessmentStatus = "required";
      }

      if (Object.keys(employmentUpdates).length > 0) {
        await tx
          .update(hrmEmploymentRecords)
          .set({
            ...employmentUpdates,
            updatedAt: sql`now()`,
          } as Record<string, unknown>)
          .where(
            and(
              eq(hrmEmploymentRecords.orgId, orgId),
              eq(hrmEmploymentRecords.id, input.employmentId),
            ),
          );
      }

      if (input.employmentType === "contract" && input.contract) {
        const [inserted] = await tx
          .insert(hrmEmploymentContracts)
          .values({
            orgId,
            employmentId: input.employmentId,
            contractNumber: input.contract.contractNumber,
            contractType: input.contract.contractType,
            contractStartDate: input.contract.contractStartDate,
            contractEndDate: input.contract.contractEndDate ?? null,
            documentFileId: input.contract.documentFileId ?? null,
          })
          .returning({ id: hrmEmploymentContracts.id });
        if (!inserted) throw new Error("Failed to insert employment contract");
        contractId = inserted.id;

        const contractPayload = {
          contractId: inserted.id,
          employmentId: input.employmentId,
          contractNumber: input.contract.contractNumber,
          contractType: input.contract.contractType,
          contractStartDate: input.contract.contractStartDate,
          contractEndDate: input.contract.contractEndDate ?? null,
          documentFileId: input.contract.documentFileId ?? null,
          createdBy: actorPrincipalId ?? null,
          createdAt: performedAt,
          correlationId,
        };
        await tx.insert(auditLog).values({
          orgId,
          actorPrincipalId: actorPrincipalId ?? null,
          action: HRM_EVENTS.EMPLOYMENT_CONTRACT_ADDED,
          entityType: "hrm_employment_contract",
          entityId: inserted.id,
          correlationId,
          details: contractPayload,
        });
        await tx.insert(outboxEvent).values({
          orgId,
          type: "HRM.EMPLOYMENT_CONTRACT_ADDED",
          version: "1",
          correlationId,
          payload: contractPayload,
        });
      }

      const previousValues: Record<string, unknown> = {};
      const newValues: Record<string, unknown> = {};
      if (input.fteRatio) {
        previousValues.fteRatio = previousFteRatio;
        newValues.fteRatio = input.fteRatio;
      }
      if (input.probationEndDate !== undefined) {
        previousValues.probationEndDate = employment.probationEndDate ?? null;
        newValues.probationEndDate = input.probationEndDate;
      }
      if (input.employmentType !== undefined) {
        previousValues.employmentType = employment.employmentType;
        newValues.employmentType = input.employmentType;
      }

      const today = new Date().toISOString().slice(0, 10);
      const retroactive = input.effectiveFrom < today;

      const payload = {
        employmentId: input.employmentId,
        effectiveFrom: input.effectiveFrom,
        changeReason: input.changeReason ?? null,
        previousValues,
        newValues,
        contractId: contractId ?? null,
        retroactive,
        actorId: actorPrincipalId ?? null,
        performedAt,
        correlationId,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.EMPLOYMENT_TERMS_CHANGED,
        entityType: "hrm_employment",
        entityId: input.employmentId,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.EMPLOYMENT_TERMS_CHANGED",
        version: "1",
        correlationId,
        payload,
      });

      if (requiresImpactAssessment) {
        await tx.insert(outboxEvent).values({
          orgId,
          type: "HRM.EMPLOYMENT_TERMS_IMPACT_ASSESSMENT_REQUIRED",
          version: "1",
          correlationId,
          payload: {
            employmentId: input.employmentId,
            effectiveFrom: input.effectiveFrom,
            employmentTypeChanged,
            fteRatioChanged,
            actorId: actorPrincipalId ?? null,
            performedAt,
            correlationId,
          },
        });
      }

      return {
        employmentId: input.employmentId,
        contractId,
      };
    });

    return ok(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown_error";
    if (msg === "EMPLOYMENT_NOT_FOUND") {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }
    if (msg === "INVALID_EMPLOYMENT_STATE") {
      return err(
        HRM_ERROR_CODES.INVALID_EMPLOYMENT_STATE,
        "Employment must be active, probation, or suspended to change terms",
        { employmentId: input.employmentId },
      );
    }
    if (msg === "WORK_ASSIGNMENT_NOT_FOUND") {
      return err(HRM_ERROR_CODES.WORK_ASSIGNMENT_NOT_FOUND, "Current work assignment not found", {
        employmentId: input.employmentId,
      });
    }
    if (msg === "OVERLAPPING_ASSIGNMENTS") {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "Terms change would create overlapping work assignments",
        { employmentId: input.employmentId },
      );
    }
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to change employment terms", {
      cause: msg,
    });
  }
}
