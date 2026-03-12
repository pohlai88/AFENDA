import type { DbClient } from "@afenda/db";
import { auditLog, hrmExitClearanceItems, hrmSeparationCases, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { FinalizeSeparationInput, FinalizeSeparationOutput } from "../dto/finalize-separation.dto";

export async function finalizeSeparation(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: FinalizeSeparationInput,
): Promise<HrmResult<FinalizeSeparationOutput>> {
  const [separationCase] = await db.select({ id: hrmSeparationCases.id, caseStatus: hrmSeparationCases.caseStatus }).from(hrmSeparationCases).where(and(eq(hrmSeparationCases.orgId, orgId), eq(hrmSeparationCases.id, input.separationCaseId)));
  if (!separationCase) return err(HRM_ERROR_CODES.SEPARATION_CASE_NOT_FOUND, "Separation case not found", { separationCaseId: input.separationCaseId });

  const pendingMandatory = await db.select({ id: hrmExitClearanceItems.id }).from(hrmExitClearanceItems).where(and(eq(hrmExitClearanceItems.orgId, orgId), eq(hrmExitClearanceItems.separationCaseId, input.separationCaseId), eq(hrmExitClearanceItems.mandatory, true), sql`${hrmExitClearanceItems.clearanceStatus} <> 'cleared'`));
  if (pendingMandatory[0]) return err(HRM_ERROR_CODES.CONFLICT, "Mandatory exit clearance items remain uncleared", { separationCaseId: input.separationCaseId });

  try {
    const data = await db.transaction(async (tx) => {
      await tx.update(hrmSeparationCases).set({ caseStatus: "closed", closedAt: sql`now()::date`, updatedAt: sql`now()` }).where(and(eq(hrmSeparationCases.orgId, orgId), eq(hrmSeparationCases.id, input.separationCaseId)));
      const payload = { separationCaseId: input.separationCaseId, status: "closed", previousStatus: separationCase.caseStatus };
      await tx.insert(auditLog).values({ orgId, actorPrincipalId: actorPrincipalId ?? null, action: HRM_EVENTS.SEPARATION_FINALIZED, entityType: "hrm_separation_case", entityId: input.separationCaseId, correlationId, details: payload });
      await tx.insert(outboxEvent).values({ orgId, type: "HRM.SEPARATION_FINALIZED", version: "1", correlationId, payload });
      return payload;
    });
    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to finalize separation", { cause: error instanceof Error ? error.message : "unknown_error" });
  }
}