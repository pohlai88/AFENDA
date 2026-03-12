import type { DbClient } from "@afenda/db";
import { auditLog, hrmExitClearanceItems, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { ClearExitItemInput, ClearExitItemOutput } from "../dto/clear-exit-item.dto";

export async function clearExitItem(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: ClearExitItemInput,
): Promise<HrmResult<ClearExitItemOutput>> {
  const [item] = await db.select({ id: hrmExitClearanceItems.id, clearanceStatus: hrmExitClearanceItems.clearanceStatus }).from(hrmExitClearanceItems).where(and(eq(hrmExitClearanceItems.orgId, orgId), eq(hrmExitClearanceItems.id, input.exitClearanceItemId)));
  if (!item) return err(HRM_ERROR_CODES.EXIT_CLEARANCE_ITEM_NOT_FOUND, "Exit clearance item not found", { exitClearanceItemId: input.exitClearanceItemId });

  try {
    const data = await db.transaction(async (tx) => {
      await tx.update(hrmExitClearanceItems).set({ clearanceStatus: "cleared", clearedAt: sql`${input.clearedAt}::date`, updatedAt: sql`now()` }).where(and(eq(hrmExitClearanceItems.orgId, orgId), eq(hrmExitClearanceItems.id, input.exitClearanceItemId)));
      const payload = { exitClearanceItemId: input.exitClearanceItemId, status: "cleared", clearedAt: input.clearedAt, previousStatus: item.clearanceStatus };
      await tx.insert(auditLog).values({ orgId, actorPrincipalId: actorPrincipalId ?? null, action: HRM_EVENTS.EXIT_ITEM_CLEARED, entityType: "hrm_exit_clearance_item", entityId: input.exitClearanceItemId, correlationId, details: payload });
      await tx.insert(outboxEvent).values({ orgId, type: "HRM.EXIT_ITEM_CLEARED", version: "1", correlationId, payload });
      return payload;
    });
    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to clear exit item", { cause: error instanceof Error ? error.message : "unknown_error" });
  }
}