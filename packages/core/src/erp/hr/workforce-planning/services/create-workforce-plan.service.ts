import type { DbClient } from "@afenda/db";
import { auditLog, hrmWorkforcePlans, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateWorkforcePlanInput {
  planCode: string;
  planName: string;
  planYear: number;
  status?: string;
}

export interface CreateWorkforcePlanOutput {
  workforcePlanId: string;
}

export async function createWorkforcePlan(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateWorkforcePlanInput,
): Promise<HrmResult<CreateWorkforcePlanOutput>> {
  if (!input.planCode || !input.planName || input.planYear == null) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "planCode, planName, and planYear are required",
    );
  }

  try {
    const [existing] = await db
      .select({ id: hrmWorkforcePlans.id })
      .from(hrmWorkforcePlans)
      .where(
        and(
          eq(hrmWorkforcePlans.orgId, orgId),
          eq(hrmWorkforcePlans.planCode, input.planCode),
        ),
      );

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Workforce plan with this code already exists", {
        planCode: input.planCode,
      });
    }

    const status = input.status ?? "draft";

    const [row] = await db
      .insert(hrmWorkforcePlans)
      .values({
        orgId,
        planCode: input.planCode,
        planName: input.planName,
        planYear: input.planYear,
        status,
      })
      .returning({ id: hrmWorkforcePlans.id });

    if (!row) {
      throw new Error("Failed to create workforce plan");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.WORKFORCE_PLAN_CREATED,
      entityType: "hrm_workforce_plan",
      entityId: row.id,
      correlationId,
      details: {
        workforcePlanId: row.id,
        planCode: input.planCode,
        planYear: input.planYear,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.WORKFORCE_PLAN_CREATED",
      version: "1",
      correlationId,
      payload: {
        workforcePlanId: row.id,
        planCode: input.planCode,
        planYear: input.planYear,
      },
    });

    return ok({ workforcePlanId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create workforce plan", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
