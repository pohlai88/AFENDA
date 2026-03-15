import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmPositions,
  hrmSuccessionPlans,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateSuccessionPlanInput {
  positionId: string;
  criticalRoleFlag?: boolean;
}

export interface CreateSuccessionPlanOutput {
  successionPlanId: string;
  status: string;
}

export async function createSuccessionPlan(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateSuccessionPlanInput,
): Promise<HrmResult<CreateSuccessionPlanOutput>> {
  if (!input.positionId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "positionId is required");
  }

  try {
    const [position] = await db
      .select({ id: hrmPositions.id })
      .from(hrmPositions)
      .where(
        and(
          eq(hrmPositions.orgId, orgId),
          eq(hrmPositions.id, input.positionId),
        ),
      );

    if (!position) {
      return err(HRM_ERROR_CODES.POSITION_NOT_FOUND, "Position not found", {
        positionId: input.positionId,
      });
    }

    const [existing] = await db
      .select({ id: hrmSuccessionPlans.id })
      .from(hrmSuccessionPlans)
      .where(
        and(
          eq(hrmSuccessionPlans.orgId, orgId),
          eq(hrmSuccessionPlans.positionId, input.positionId),
        ),
      );

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Succession plan already exists for this position", {
        positionId: input.positionId,
      });
    }

    const [row] = await db
      .insert(hrmSuccessionPlans)
      .values({
        orgId,
        positionId: input.positionId,
        criticalRoleFlag: input.criticalRoleFlag ?? false,
        status: "draft",
      })
      .returning({
        id: hrmSuccessionPlans.id,
        status: hrmSuccessionPlans.status,
      });

    if (!row) {
      throw new Error("Failed to create succession plan");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.SUCCESSION_PLAN_CREATED,
      entityType: "hrm_succession_plan",
      entityId: row.id,
      correlationId,
      details: {
        successionPlanId: row.id,
        positionId: input.positionId,
        status: row.status,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.SUCCESSION_PLAN_CREATED",
      version: "1",
      correlationId,
      payload: {
        successionPlanId: row.id,
        positionId: input.positionId,
        status: row.status,
      },
    });

    return ok({
      successionPlanId: row.id,
      status: row.status,
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create succession plan", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
