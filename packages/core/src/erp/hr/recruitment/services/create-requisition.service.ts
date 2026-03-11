import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { auditLog, hrmJobRequisitions, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { CreateRequisitionInput, CreateRequisitionOutput } from "../dto/create-requisition.dto";

function buildRequisitionNumber(): string {
  return `REQ-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createRequisition(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateRequisitionInput,
): Promise<HrmResult<CreateRequisitionOutput>> {
  if (!input.requisitionTitle || !input.legalEntityId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "requisitionTitle and legalEntityId are required");
  }

  const requisitionNumber = input.requisitionNumber ?? buildRequisitionNumber();

  try {
    const existing = await db
      .select({ id: hrmJobRequisitions.id })
      .from(hrmJobRequisitions)
      .where(
        and(
          eq(hrmJobRequisitions.orgId, orgId),
          eq(hrmJobRequisitions.requisitionNumber, requisitionNumber),
        ),
      );

    if (existing[0]) {
      return err(HRM_ERROR_CODES.CONFLICT, "requisitionNumber already exists", {
        requisitionNumber,
      });
    }

    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmJobRequisitions)
        .values({
          orgId,
          requisitionNumber,
          requisitionTitle: input.requisitionTitle,
          legalEntityId: input.legalEntityId,
          orgUnitId: input.orgUnitId,
          positionId: input.positionId,
          hiringManagerEmployeeId: input.hiringManagerEmployeeId,
          requestedHeadcount: input.requestedHeadcount ?? "1",
          requestedStartDate: input.requestedStartDate
            ? sql`${input.requestedStartDate}::date`
            : undefined,
          status: "submitted",
          submittedAt: sql`now()::date`,
          submittedBy: actorPrincipalId ?? null,
        })
        .returning({
          id: hrmJobRequisitions.id,
          requisitionNumber: hrmJobRequisitions.requisitionNumber,
        });

      if (!row) {
        throw new Error("Failed to insert requisition");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.REQUISITION_CREATED,
        entityType: "hrm_requisition",
        entityId: row.id,
        correlationId,
        details: { requisitionId: row.id, requisitionNumber: row.requisitionNumber },
      });
      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.REQUISITION_CREATED",
        version: "1",
        correlationId,
        payload: { requisitionId: row.id, requisitionNumber: row.requisitionNumber },
      });

      return { requisitionId: row.id, requisitionNumber: row.requisitionNumber };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create requisition", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}