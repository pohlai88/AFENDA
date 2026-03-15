import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmOrgUnits,
  hrmPositionBudgets,
  hrmPositions,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface SetPositionBudgetInput {
  orgUnitId: string;
  positionId: string;
  planYear: number;
  approvedHeadcount: number;
  budgetAmount: bigint;
}

export interface SetPositionBudgetOutput {
  positionBudgetId: string;
}

export async function setPositionBudget(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: SetPositionBudgetInput,
): Promise<HrmResult<SetPositionBudgetOutput>> {
  if (
    !input.orgUnitId ||
    !input.positionId ||
    input.planYear == null ||
    input.approvedHeadcount == null ||
    input.budgetAmount == null
  ) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "orgUnitId, positionId, planYear, approvedHeadcount, and budgetAmount are required",
    );
  }

  if (input.approvedHeadcount < 0) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "approvedHeadcount must be >= 0",
    );
  }

  try {
    const [orgUnit] = await db
      .select({ id: hrmOrgUnits.id })
      .from(hrmOrgUnits)
      .where(
        and(
          eq(hrmOrgUnits.orgId, orgId),
          eq(hrmOrgUnits.id, input.orgUnitId),
        ),
      );

    if (!orgUnit) {
      return err(HRM_ERROR_CODES.ORG_UNIT_NOT_FOUND, "Org unit not found", {
        orgUnitId: input.orgUnitId,
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
      .select({ id: hrmPositionBudgets.id })
      .from(hrmPositionBudgets)
      .where(
        and(
          eq(hrmPositionBudgets.orgId, orgId),
          eq(hrmPositionBudgets.orgUnitId, input.orgUnitId),
          eq(hrmPositionBudgets.positionId, input.positionId),
          eq(hrmPositionBudgets.planYear, input.planYear),
        ),
      );

    let row: { id: string };

    if (existing) {
      await db
        .update(hrmPositionBudgets)
        .set({
          approvedHeadcount: input.approvedHeadcount,
          budgetAmount: input.budgetAmount,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(hrmPositionBudgets.orgId, orgId),
            eq(hrmPositionBudgets.id, existing.id),
          ),
        );
      row = { id: existing.id };
    } else {
      const [inserted] = await db
        .insert(hrmPositionBudgets)
        .values({
          orgId,
          orgUnitId: input.orgUnitId,
          positionId: input.positionId,
          planYear: input.planYear,
          approvedHeadcount: input.approvedHeadcount,
          budgetAmount: input.budgetAmount,
        })
        .returning({ id: hrmPositionBudgets.id });

      if (!inserted) {
        throw new Error("Failed to set position budget");
      }
      row = inserted;
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.POSITION_BUDGET_SET,
      entityType: "hrm_position_budget",
      entityId: row.id,
      correlationId,
      details: {
        positionBudgetId: row.id,
        orgUnitId: input.orgUnitId,
        positionId: input.positionId,
        planYear: input.planYear,
        approvedHeadcount: input.approvedHeadcount,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.POSITION_BUDGET_SET",
      version: "1",
      correlationId,
      payload: {
        positionBudgetId: row.id,
        orgUnitId: input.orgUnitId,
        positionId: input.positionId,
        planYear: input.planYear,
      },
    });

    return ok({ positionBudgetId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to set position budget", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
