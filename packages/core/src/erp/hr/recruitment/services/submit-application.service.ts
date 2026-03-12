import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmCandidateApplications,
  hrmCandidates,
  hrmJobRequisitions,
  outboxEvent,
} from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { SubmitApplicationInput, SubmitApplicationOutput } from "../dto/submit-application.dto";

export async function submitApplication(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: SubmitApplicationInput,
): Promise<HrmResult<SubmitApplicationOutput>> {
  const [candidate] = await db
    .select({ id: hrmCandidates.id })
    .from(hrmCandidates)
    .where(and(eq(hrmCandidates.orgId, orgId), eq(hrmCandidates.id, input.candidateId)));

  if (!candidate) {
    return err(HRM_ERROR_CODES.CANDIDATE_NOT_FOUND, "Candidate not found", {
      candidateId: input.candidateId,
    });
  }

  const [requisition] = await db
    .select({ id: hrmJobRequisitions.id, status: hrmJobRequisitions.status })
    .from(hrmJobRequisitions)
    .where(and(eq(hrmJobRequisitions.orgId, orgId), eq(hrmJobRequisitions.id, input.requisitionId)));

  if (!requisition) {
    return err(HRM_ERROR_CODES.REQUISITION_NOT_FOUND, "Requisition not found", {
      requisitionId: input.requisitionId,
    });
  }

  if (requisition.status !== "approved") {
    return err(HRM_ERROR_CODES.CONFLICT, "Requisition must be approved before application submission", {
      requisitionId: input.requisitionId,
      status: requisition.status,
    });
  }

  try {
    const existing = await db
      .select({ id: hrmCandidateApplications.id })
      .from(hrmCandidateApplications)
      .where(
        and(
          eq(hrmCandidateApplications.orgId, orgId),
          eq(hrmCandidateApplications.candidateId, input.candidateId),
          eq(hrmCandidateApplications.requisitionId, input.requisitionId),
        ),
      );

    if (existing[0]) {
      return err(HRM_ERROR_CODES.CONFLICT, "Application already exists", {
        candidateId: input.candidateId,
        requisitionId: input.requisitionId,
      });
    }

    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmCandidateApplications)
        .values({
          orgId,
          candidateId: input.candidateId,
          requisitionId: input.requisitionId,
          applicationStage: input.stageCode ?? "applied",
          appliedAt: input.applicationDate ? sql`${input.applicationDate}::date` : sql`now()::date`,
        })
        .returning({
          id: hrmCandidateApplications.id,
          applicationStage: hrmCandidateApplications.applicationStage,
        });

      if (!row) {
        throw new Error("Failed to insert application");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.APPLICATION_SUBMITTED,
        entityType: "hrm_application",
        entityId: row.id,
        correlationId,
        details: {
          applicationId: row.id,
          candidateId: input.candidateId,
          requisitionId: input.requisitionId,
          stageCode: row.applicationStage,
        },
      });
      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.APPLICATION_SUBMITTED",
        version: "1",
        correlationId,
        payload: {
          applicationId: row.id,
          candidateId: input.candidateId,
          requisitionId: input.requisitionId,
          stageCode: row.applicationStage,
        },
      });

      return {
        applicationId: row.id,
        candidateId: input.candidateId,
        requisitionId: input.requisitionId,
        stageCode: row.applicationStage,
      };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to submit application", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}