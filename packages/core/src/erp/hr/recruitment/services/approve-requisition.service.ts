import type { DbClient } from "@afenda/db";
import { auditLog, hrmJobRequisitions, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { ApproveRequisitionInput, ApproveRequisitionOutput } from "../dto/approve-requisition.dto";

export async function approveRequisition(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: ApproveRequisitionInput,
): Promise<HrmResult<ApproveRequisitionOutput>> {
  const [requisition] = await db
    .select({ id: hrmJobRequisitions.id, status: hrmJobRequisitions.status })
    .from(hrmJobRequisitions)
    .where(and(eq(hrmJobRequisitions.orgId, orgId), eq(hrmJobRequisitions.id, input.requisitionId)));

  if (!requisition) {
    return err(HRM_ERROR_CODES.REQUISITION_NOT_FOUND, "Requisition not found", {
      requisitionId: input.requisitionId,
    });
  }

  try {
    const data = await db.transaction(async (tx) => {
      await tx
        .update(hrmJobRequisitions)
        .set({
          status: "approved",
          approvedAt: sql`now()::date`,
          approvedBy: actorPrincipalId ?? null,
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmJobRequisitions.orgId, orgId), eq(hrmJobRequisitions.id, input.requisitionId)));

      const payload = {
        requisitionId: input.requisitionId,
        previousStatus: requisition.status,
        currentStatus: "approved",
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.REQUISITION_APPROVED,
        entityType: "hrm_requisition",
        entityId: input.requisitionId,
        correlationId,
        details: payload,
      });
      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.REQUISITION_APPROVED",
        version: "1",
        correlationId,
        payload,
      });

      return payload;
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to approve requisition", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}