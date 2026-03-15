import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmHiringForecasts,
  hrmPositions,
  hrmWorkforcePlans,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateHiringForecastInput {
  workforcePlanId: string;
  positionId: string;
  quarter: string;
  plannedHires: number;
}

export interface CreateHiringForecastOutput {
  hiringForecastId: string;
}

export async function createHiringForecast(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateHiringForecastInput,
): Promise<HrmResult<CreateHiringForecastOutput>> {
  if (
    !input.workforcePlanId ||
    !input.positionId ||
    !input.quarter ||
    input.plannedHires == null
  ) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "workforcePlanId, positionId, quarter, and plannedHires are required",
    );
  }

  if (input.plannedHires < 0) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "plannedHires must be >= 0");
  }

  try {
    const [plan] = await db
      .select({ id: hrmWorkforcePlans.id })
      .from(hrmWorkforcePlans)
      .where(
        and(
          eq(hrmWorkforcePlans.orgId, orgId),
          eq(hrmWorkforcePlans.id, input.workforcePlanId),
        ),
      );

    if (!plan) {
      return err(HRM_ERROR_CODES.WORKFORCE_PLAN_NOT_FOUND, "Workforce plan not found", {
        workforcePlanId: input.workforcePlanId,
      });
    }

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
      .select({ id: hrmHiringForecasts.id })
      .from(hrmHiringForecasts)
      .where(
        and(
          eq(hrmHiringForecasts.orgId, orgId),
          eq(hrmHiringForecasts.workforcePlanId, input.workforcePlanId),
          eq(hrmHiringForecasts.positionId, input.positionId),
          eq(hrmHiringForecasts.quarter, input.quarter),
        ),
      );

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Hiring forecast already exists for this plan/position/quarter", {
        workforcePlanId: input.workforcePlanId,
        positionId: input.positionId,
        quarter: input.quarter,
      });
    }

    const [row] = await db
      .insert(hrmHiringForecasts)
      .values({
        orgId,
        workforcePlanId: input.workforcePlanId,
        positionId: input.positionId,
        quarter: input.quarter,
        plannedHires: input.plannedHires,
      })
      .returning({ id: hrmHiringForecasts.id });

    if (!row) {
      throw new Error("Failed to create hiring forecast");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.HIRING_FORECAST_CREATED,
      entityType: "hrm_hiring_forecast",
      entityId: row.id,
      correlationId,
      details: {
        hiringForecastId: row.id,
        workforcePlanId: input.workforcePlanId,
        positionId: input.positionId,
        quarter: input.quarter,
        plannedHires: input.plannedHires,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.HIRING_FORECAST_CREATED",
      version: "1",
      correlationId,
      payload: {
        hiringForecastId: row.id,
        workforcePlanId: input.workforcePlanId,
        positionId: input.positionId,
        quarter: input.quarter,
      },
    });

    return ok({ hiringForecastId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create hiring forecast", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
