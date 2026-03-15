import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmployeeProfiles,
  hrmEmploymentRecords,
  hrmEmploymentStatusHistory,
  outboxEvent,
} from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface ResumeEmploymentInput {
  employmentId: string;
  effectiveDate: string;
  comment?: string;
}

export interface ResumeEmploymentOutput {
  employmentId: string;
  resumedAt: string;
}

export async function resumeEmployment(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: ResumeEmploymentInput,
): Promise<HrmResult<ResumeEmploymentOutput>> {
  if (!input.employmentId || !input.effectiveDate) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "employmentId and effectiveDate are required");
  }

  try {
    const [employment] = await db
      .select({
        id: hrmEmploymentRecords.id,
        employeeId: hrmEmploymentRecords.employeeId,
        status: hrmEmploymentRecords.employmentStatus,
      })
      .from(hrmEmploymentRecords)
      .where(and(eq(hrmEmploymentRecords.orgId, orgId), eq(hrmEmploymentRecords.id, input.employmentId)));

    if (!employment) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    if (employment.status !== "suspended") {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_SUSPENDED, "Employment is not suspended", {
        employmentId: input.employmentId,
        employmentStatus: employment.status,
      });
    }

    const data = await db.transaction(async (tx) => {
      await tx.insert(hrmEmploymentStatusHistory).values({
        orgId,
        employmentId: input.employmentId,
        oldStatus: "suspended",
        newStatus: "active",
        changedAt: input.effectiveDate,
        changedBy: actorPrincipalId ?? null,
        metadata: input.comment ? { comment: input.comment } : undefined,
      });

      await tx
        .update(hrmEmploymentRecords)
        .set({
          employmentStatus: "active",
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmEmploymentRecords.orgId, orgId), eq(hrmEmploymentRecords.id, input.employmentId)));

      await tx
        .update(hrmEmployeeProfiles)
        .set({
          currentStatus: "active",
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmEmployeeProfiles.orgId, orgId), eq(hrmEmployeeProfiles.id, employment.employeeId)));

      const payload = {
        employmentId: input.employmentId,
        resumedAt: input.effectiveDate,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.EMPLOYEE_RESUMED,
        entityType: "hrm_employment",
        entityId: input.employmentId,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.EMPLOYEE_RESUMED",
        version: "1",
        correlationId,
        payload,
      });

      return {
        employmentId: input.employmentId,
        resumedAt: input.effectiveDate,
      };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to resume employment", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
