import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmDisciplinaryActions,
  hrmGrievanceCases,
  hrmHrCaseEvidence,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface AttachEvidenceInput {
  caseType: "grievance" | "disciplinary";
  caseId: string;
  evidenceType: string;
  fileReference?: string | null;
}

export interface AttachEvidenceOutput {
  evidenceId: string;
}

export async function attachEvidence(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: AttachEvidenceInput,
): Promise<HrmResult<AttachEvidenceOutput>> {
  if (!input.caseType || !input.caseId || !input.evidenceType) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "caseType, caseId, and evidenceType are required",
    );
  }

  try {
    if (input.caseType === "grievance") {
      const [grievance] = await db
        .select({ id: hrmGrievanceCases.id })
        .from(hrmGrievanceCases)
        .where(
          and(
            eq(hrmGrievanceCases.orgId, orgId),
            eq(hrmGrievanceCases.id, input.caseId),
          ),
        );
      if (!grievance) {
        return err(HRM_ERROR_CODES.GRIEVANCE_CASE_NOT_FOUND, "Grievance case not found", {
          caseId: input.caseId,
        });
      }
    } else {
      const [disciplinary] = await db
        .select({ id: hrmDisciplinaryActions.id })
        .from(hrmDisciplinaryActions)
        .where(
          and(
            eq(hrmDisciplinaryActions.orgId, orgId),
            eq(hrmDisciplinaryActions.id, input.caseId),
          ),
        );
      if (!disciplinary) {
        return err(
          HRM_ERROR_CODES.DISCIPLINARY_ACTION_NOT_FOUND,
          "Disciplinary action not found",
          { caseId: input.caseId },
        );
      }
    }

    const [row] = await db
      .insert(hrmHrCaseEvidence)
      .values({
        orgId,
        caseType: input.caseType,
        caseId: input.caseId,
        evidenceType: input.evidenceType,
        fileReference: input.fileReference ?? null,
        recordedAt: sql`now()`,
      })
      .returning({ id: hrmHrCaseEvidence.id });

    if (!row) {
      throw new Error("Failed to attach evidence");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.CASE_EVIDENCE_ATTACHED,
      entityType: "hrm_hr_case_evidence",
      entityId: row.id,
      correlationId,
      details: {
        evidenceId: row.id,
        caseType: input.caseType,
        caseId: input.caseId,
        evidenceType: input.evidenceType,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.CASE_EVIDENCE_ATTACHED",
      version: "1",
      correlationId,
      payload: {
        evidenceId: row.id,
        caseType: input.caseType,
        caseId: input.caseId,
      },
    });

    return ok({ evidenceId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to attach evidence", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
