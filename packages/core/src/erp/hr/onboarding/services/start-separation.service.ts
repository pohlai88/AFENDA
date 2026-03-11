import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { auditLog, hrmEmploymentRecords, hrmExitClearanceItems, hrmSeparationCases, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { StartSeparationInput, StartSeparationOutput } from "../dto/start-separation.dto";

function buildClearanceCode(): string {
  return `EXT-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function startSeparation(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: StartSeparationInput,
): Promise<HrmResult<StartSeparationOutput>> {
  const [employment] = await db.select({ id: hrmEmploymentRecords.id }).from(hrmEmploymentRecords).where(and(eq(hrmEmploymentRecords.orgId, orgId), eq(hrmEmploymentRecords.id, input.employmentId)));
  if (!employment) return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", { employmentId: input.employmentId });

  try {
    const data = await db.transaction(async (tx) => {
      const [separationCase] = await tx.insert(hrmSeparationCases).values({ orgId, employmentId: input.employmentId, caseStatus: "open", separationType: input.separationType, initiatedAt: input.initiatedAt ? sql`${input.initiatedAt}::date` : sql`now()::date`, targetLastWorkingDate: input.targetLastWorkingDate ? sql`${input.targetLastWorkingDate}::date` : undefined }).returning({ id: hrmSeparationCases.id });
      if (!separationCase) throw new Error("Failed to insert separation case");

      const itemIds: string[] = [];
      for (const item of input.items ?? []) {
        const [row] = await tx.insert(hrmExitClearanceItems).values({ orgId, separationCaseId: separationCase.id, itemCode: item.itemCode ?? buildClearanceCode(), itemLabel: item.itemLabel, ownerEmployeeId: item.ownerEmployeeId, mandatory: item.mandatory ?? true, clearanceStatus: "pending" }).returning({ id: hrmExitClearanceItems.id });
        if (row) itemIds.push(row.id);
      }

      await tx.insert(auditLog).values({ orgId, actorPrincipalId: actorPrincipalId ?? null, action: HRM_EVENTS.SEPARATION_STARTED, entityType: "hrm_separation_case", entityId: separationCase.id, correlationId, details: { separationCaseId: separationCase.id, employmentId: input.employmentId, itemCount: itemIds.length } });
      await tx.insert(outboxEvent).values({ orgId, type: "HRM.SEPARATION_STARTED", version: "1", correlationId, payload: { separationCaseId: separationCase.id, employmentId: input.employmentId, itemIds } });

      return { separationCaseId: separationCase.id, itemIds };
    });
    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to start separation", { cause: error instanceof Error ? error.message : "unknown_error" });
  }
}