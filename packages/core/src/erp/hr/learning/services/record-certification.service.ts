import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmCertifications,
  hrmEmploymentRecords,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface RecordCertificationInput {
  employmentId: string;
  certificationCode: string;
  issuedAt: string;
  expiresAt?: string | null;
}

export interface RecordCertificationOutput {
  certificationId: string;
}

export async function recordCertification(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: RecordCertificationInput,
): Promise<HrmResult<RecordCertificationOutput>> {
  if (!input.employmentId || !input.certificationCode || !input.issuedAt) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, certificationCode, and issuedAt are required",
    );
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
      .insert(hrmCertifications)
      .values({
        orgId,
        employmentId: input.employmentId,
        certificationCode: input.certificationCode,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt ?? null,
      })
      .returning({ id: hrmCertifications.id });

    if (!row) {
      throw new Error("Failed to record certification");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.CERTIFICATION_RECORDED,
      entityType: "hrm_certification",
      entityId: row.id,
      correlationId,
      details: {
        certificationId: row.id,
        employmentId: input.employmentId,
        certificationCode: input.certificationCode,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.CERTIFICATION_RECORDED",
      version: "1",
      correlationId,
      payload: {
        certificationId: row.id,
        employmentId: input.employmentId,
        certificationCode: input.certificationCode,
      },
    });

    return ok({ certificationId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to record certification", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
