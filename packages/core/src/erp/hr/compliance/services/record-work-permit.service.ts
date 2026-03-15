import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmploymentRecords,
  hrmWorkPermitRecords,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface RecordWorkPermitInput {
  employmentId: string;
  permitType: string;
  permitNumber: string;
  issuedDate: string;
  expiryDate: string;
}

export interface RecordWorkPermitOutput {
  workPermitId: string;
}

export async function recordWorkPermit(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: RecordWorkPermitInput,
): Promise<HrmResult<RecordWorkPermitOutput>> {
  if (
    !input.employmentId ||
    !input.permitType ||
    !input.permitNumber ||
    !input.issuedDate ||
    !input.expiryDate
  ) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, permitType, permitNumber, issuedDate, and expiryDate are required",
    );
  }

  if (input.issuedDate > input.expiryDate) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "issuedDate must be before or equal to expiryDate");
  }

  try {
    const [employment] = await db
      .select({ id: hrmEmploymentRecords.id })
      .from(hrmEmploymentRecords)
      .where(
        and(
          eq(hrmEmploymentRecords.orgId, orgId),
          eq(hrmEmploymentRecords.id, input.employmentId),
        ),
      );

    if (!employment) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    const [row] = await db
      .insert(hrmWorkPermitRecords)
      .values({
        orgId,
        employmentId: input.employmentId,
        permitType: input.permitType,
        permitNumber: input.permitNumber,
        issuedDate: input.issuedDate,
        expiryDate: input.expiryDate,
      })
      .returning({ id: hrmWorkPermitRecords.id });

    if (!row) {
      throw new Error("Failed to record work permit");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.WORK_PERMIT_RECORDED,
      entityType: "hrm_work_permit_record",
      entityId: row.id,
      correlationId,
      details: {
        workPermitId: row.id,
        employmentId: input.employmentId,
        permitType: input.permitType,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.WORK_PERMIT_RECORDED",
      version: "1",
      correlationId,
      payload: {
        workPermitId: row.id,
        employmentId: input.employmentId,
        permitType: input.permitType,
      },
    });

    return ok({ workPermitId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to record work permit", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
