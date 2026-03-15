import type { DbClient } from "@afenda/db";
import { auditLog, hrmGrievanceCases, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CloseGrievanceCaseInput {
  grievanceCaseId: string;
  resolutionNotes?: string | null;
}

export interface CloseGrievanceCaseOutput {
  grievanceCaseId: string;
}

export async function closeGrievanceCase(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CloseGrievanceCaseInput,
): Promise<HrmResult<CloseGrievanceCaseOutput>> {
  if (!input.grievanceCaseId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "grievanceCaseId is required");
  }

  try {
    const [existing] = await db
      .select({
        id: hrmGrievanceCases.id,
        status: hrmGrievanceCases.status,
        employmentId: hrmGrievanceCases.employmentId,
      })
      .from(hrmGrievanceCases)
      .where(
        and(
          eq(hrmGrievanceCases.orgId, orgId),
          eq(hrmGrievanceCases.id, input.grievanceCaseId),
        ),
      );

    if (!existing) {
      return err(HRM_ERROR_CODES.GRIEVANCE_CASE_NOT_FOUND, "Grievance case not found", {
        grievanceCaseId: input.grievanceCaseId,
      });
    }

    if (existing.status === "closed") {
      return err(HRM_ERROR_CODES.CONFLICT, "Grievance case is already closed", {
        grievanceCaseId: input.grievanceCaseId,
      });
    }

    await db
      .update(hrmGrievanceCases)
      .set({
        status: "closed",
        resolvedAt: sql`now()`,
        resolutionNotes: input.resolutionNotes ?? null,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hrmGrievanceCases.orgId, orgId),
          eq(hrmGrievanceCases.id, input.grievanceCaseId),
        ),
      );

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.GRIEVANCE_CASE_CLOSED,
      entityType: "hrm_grievance_case",
      entityId: input.grievanceCaseId,
      correlationId,
      details: {
        grievanceCaseId: input.grievanceCaseId,
        resolutionNotes: input.resolutionNotes,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.GRIEVANCE_CASE_CLOSED",
      version: "1",
      correlationId,
      payload: {
        grievanceCaseId: input.grievanceCaseId,
      },
    });

    return ok({ grievanceCaseId: input.grievanceCaseId });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to close grievance case", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
