import type { DbClient } from "@afenda/db";
import { auditLog, hrmPositions, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { ClosePositionInput, ClosePositionOutput } from "../dto/close-position.dto";

export async function closePosition(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: ClosePositionInput,
): Promise<HrmResult<ClosePositionOutput>> {
  if (!input.positionId || !input.effectiveTo) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "positionId and effectiveTo are required");
  }

  try {
    const [position] = await db
      .select({ id: hrmPositions.id, status: hrmPositions.positionStatus })
      .from(hrmPositions)
      .where(and(eq(hrmPositions.orgId, orgId), eq(hrmPositions.id, input.positionId)));

    if (!position) {
      return err(HRM_ERROR_CODES.POSITION_NOT_FOUND, "Position not found", {
        positionId: input.positionId,
      });
    }

    const data = await db.transaction(async (tx) => {
      await tx
        .update(hrmPositions)
        .set({
          positionStatus: "closed",
          effectiveTo: sql`${input.effectiveTo}::timestamptz`,
          isCurrent: false,
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmPositions.orgId, orgId), eq(hrmPositions.id, input.positionId)));

      const payload = {
        positionId: input.positionId,
        previousStatus: position.status,
        currentStatus: "closed",
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.POSITION_CLOSED,
        entityType: "hrm_position",
        entityId: input.positionId,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.POSITION_CLOSED",
        version: "1",
        correlationId,
        payload,
      });

      return payload;
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to close position", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}