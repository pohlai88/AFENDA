import type { DbClient } from "@afenda/db";
import {
  hrmLaborCostProjections,
  hrmWorkforceScenarios,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface GetScenarioProjectionParams {
  orgId: string;
  workforcePlanId: string;
  scenarioId: string;
}

export interface LaborCostProjectionView {
  orgUnitId: string;
  projectedAmount: string;
}

export interface ScenarioProjectionView {
  scenarioId: string;
  scenarioName: string;
  assumptionsJson: Record<string, unknown> | null;
  projections: LaborCostProjectionView[];
}

export async function getScenarioProjection(
  db: DbClient,
  params: GetScenarioProjectionParams,
): Promise<ScenarioProjectionView | null> {
  const [scenario] = await db
    .select()
    .from(hrmWorkforceScenarios)
    .where(
      and(
        eq(hrmWorkforceScenarios.orgId, params.orgId),
        eq(hrmWorkforceScenarios.workforcePlanId, params.workforcePlanId),
        eq(hrmWorkforceScenarios.id, params.scenarioId),
      ),
    );

  if (!scenario) {
    return null;
  }

  const projectionRows = await db
    .select({
      orgUnitId: hrmLaborCostProjections.orgUnitId,
      projectedAmount: hrmLaborCostProjections.projectedAmount,
    })
    .from(hrmLaborCostProjections)
    .where(
      and(
        eq(hrmLaborCostProjections.orgId, params.orgId),
        eq(hrmLaborCostProjections.workforcePlanId, params.workforcePlanId),
        eq(hrmLaborCostProjections.scenarioId, params.scenarioId),
      ),
    );

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.scenarioName,
    assumptionsJson: scenario.assumptionsJson as Record<string, unknown> | null,
    projections: projectionRows.map((r) => ({
      orgUnitId: r.orgUnitId,
      projectedAmount: String(r.projectedAmount),
    })),
  };
}
