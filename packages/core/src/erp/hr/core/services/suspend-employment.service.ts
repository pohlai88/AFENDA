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

export interface SuspendEmploymentInput {
  employmentId: string;
  effectiveDate: string;
  reasonCode: string;
  comment?: string;
}

export interface SuspendEmploymentOutput {
  employmentId: string;
  suspendedAt: string;
}

export async function suspendEmployment(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: SuspendEmploymentInput,
): Promise<HrmResult<SuspendEmploymentOutput>> {
  if (!input.employmentId || !input.effectiveDate || !input.reasonCode) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, effectiveDate, and reasonCode are required",
    );
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

    if (employment.status === "suspended") {
      return err(HRM_ERROR_CODES.EMPLOYMENT_ALREADY_SUSPENDED, "Employment is already suspended", {
        employmentId: input.employmentId,
      });
    }

    if (["terminated", "inactive"].includes(employment.status)) {
      return err(
        HRM_ERROR_CODES.INVALID_EMPLOYMENT_STATE,
        "Cannot suspend terminated or inactive employment",
        { employmentId: input.employmentId, employmentStatus: employment.status },
      );
    }

    const data = await db.transaction(async (tx) => {
      await tx.insert(hrmEmploymentStatusHistory).values({
        orgId,
        employmentId: input.employmentId,
        oldStatus: employment.status,
        newStatus: "suspended",
        changedAt: input.effectiveDate,
        changedBy: actorPrincipalId ?? null,
        reasonCode: input.reasonCode,
        metadata: input.comment ? { comment: input.comment } : undefined,
      });

      await tx
        .update(hrmEmploymentRecords)
        .set({
          employmentStatus: "suspended",
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmEmploymentRecords.orgId, orgId), eq(hrmEmploymentRecords.id, input.employmentId)));

      await tx
        .update(hrmEmployeeProfiles)
        .set({
          currentStatus: "suspended",
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmEmployeeProfiles.orgId, orgId), eq(hrmEmployeeProfiles.id, employment.employeeId)));

      const payload = {
        employmentId: input.employmentId,
        suspendedAt: input.effectiveDate,
        reasonCode: input.reasonCode,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.EMPLOYEE_SUSPENDED,
        entityType: "hrm_employment",
        entityId: input.employmentId,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.EMPLOYEE_SUSPENDED",
        version: "1",
        correlationId,
        payload,
      });

      return {
        employmentId: input.employmentId,
        suspendedAt: input.effectiveDate,
      };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to suspend employment", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
