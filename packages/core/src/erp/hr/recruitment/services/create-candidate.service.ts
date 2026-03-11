import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { auditLog, hrmCandidates, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { CreateCandidateInput, CreateCandidateOutput } from "../dto/create-candidate.dto";

function buildCandidateCode(): string {
  return `CAN-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createCandidate(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateCandidateInput,
): Promise<HrmResult<CreateCandidateOutput>> {
  if (!input.fullName) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "fullName is required");
  }

  const candidateCode = input.candidateCode ?? buildCandidateCode();

  try {
    const existing = await db
      .select({ id: hrmCandidates.id })
      .from(hrmCandidates)
      .where(and(eq(hrmCandidates.orgId, orgId), eq(hrmCandidates.candidateCode, candidateCode)));

    if (existing[0]) {
      return err(HRM_ERROR_CODES.CONFLICT, "candidateCode already exists", { candidateCode });
    }

    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmCandidates)
        .values({
          orgId,
          candidateCode,
          fullName: input.fullName,
          email: input.email,
          mobilePhone: input.mobilePhone,
          sourceChannel: input.sourceChannel,
          status: input.status ?? "active",
        })
        .returning({ id: hrmCandidates.id, candidateCode: hrmCandidates.candidateCode });

      if (!row) {
        throw new Error("Failed to insert candidate");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.CANDIDATE_CREATED,
        entityType: "hrm_candidate",
        entityId: row.id,
        correlationId,
        details: { candidateId: row.id, candidateCode: row.candidateCode },
      });
      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.CANDIDATE_CREATED",
        version: "1",
        correlationId,
        payload: { candidateId: row.id, candidateCode: row.candidateCode },
      });

      return { candidateId: row.id, candidateCode: row.candidateCode };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create candidate", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}