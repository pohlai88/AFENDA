import type { DbClient } from "@afenda/db";
import { auditLog, hrmEmploymentRecords, hrmGrievanceCases, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateGrievanceCaseInput {
  employmentId: string;
  caseType: string;
  status?: string;
}

export interface CreateGrievanceCaseOutput {
  grievanceCaseId: string;
}

export async function createGrievanceCase(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateGrievanceCaseInput,
): Promise<HrmResult<CreateGrievanceCaseOutput>> {
  if (!input.employmentId || !input.caseType) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId and caseType are required",
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

    const status = input.status ?? "open";

    const [row] = await db
      .insert(hrmGrievanceCases)
      .values({
        orgId,
        employmentId: input.employmentId,
        caseType: input.caseType,
        openedAt: sql`now()`,
        status,
      })
      .returning({ id: hrmGrievanceCases.id });

    if (!row) {
      throw new Error("Failed to create grievance case");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.GRIEVANCE_CASE_CREATED,
      entityType: "hrm_grievance_case",
      entityId: row.id,
      correlationId,
      details: {
        grievanceCaseId: row.id,
        employmentId: input.employmentId,
        caseType: input.caseType,
        status,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.GRIEVANCE_CASE_CREATED",
      version: "1",
      correlationId,
      payload: {
        grievanceCaseId: row.id,
        employmentId: input.employmentId,
        caseType: input.caseType,
      },
    });

    return ok({ grievanceCaseId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create grievance case", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
