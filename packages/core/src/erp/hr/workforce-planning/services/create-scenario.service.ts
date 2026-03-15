import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmWorkforcePlans,
  hrmWorkforceScenarios,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateScenarioInput {
  workforcePlanId: string;
  scenarioName: string;
  assumptionsJson?: Record<string, unknown> | null;
}

export interface CreateScenarioOutput {
  scenarioId: string;
}

export async function createScenario(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateScenarioInput,
): Promise<HrmResult<CreateScenarioOutput>> {
  if (!input.workforcePlanId || !input.scenarioName) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "workforcePlanId and scenarioName are required",
    );
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

    const [row] = await db
      .insert(hrmWorkforceScenarios)
      .values({
        orgId,
        workforcePlanId: input.workforcePlanId,
        scenarioName: input.scenarioName,
        assumptionsJson: input.assumptionsJson ?? null,
      })
      .returning({ id: hrmWorkforceScenarios.id });

    if (!row) {
      throw new Error("Failed to create scenario");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.WORKFORCE_SCENARIO_CREATED,
      entityType: "hrm_workforce_scenario",
      entityId: row.id,
      correlationId,
      details: {
        scenarioId: row.id,
        workforcePlanId: input.workforcePlanId,
        scenarioName: input.scenarioName,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.WORKFORCE_SCENARIO_CREATED",
      version: "1",
      correlationId,
      payload: {
        scenarioId: row.id,
        workforcePlanId: input.workforcePlanId,
        scenarioName: input.scenarioName,
      },
    });

    return ok({ scenarioId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create scenario", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
