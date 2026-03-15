import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmploymentRecords,
  hrmSuccessionPlans,
  hrmSuccessorNominations,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface NominateSuccessorInput {
  successionPlanId: string;
  employmentId: string;
  readinessLevel: string;
}

export interface NominateSuccessorOutput {
  successorNominationId: string;
}

export async function nominateSuccessor(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: NominateSuccessorInput,
): Promise<HrmResult<NominateSuccessorOutput>> {
  if (!input.successionPlanId || !input.employmentId || !input.readinessLevel) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "successionPlanId, employmentId, and readinessLevel are required");
  }

  try {
    const [plan] = await db
      .select({ id: hrmSuccessionPlans.id, status: hrmSuccessionPlans.status })
      .from(hrmSuccessionPlans)
      .where(
        and(
          eq(hrmSuccessionPlans.orgId, orgId),
          eq(hrmSuccessionPlans.id, input.successionPlanId),
        ),
      );

    if (!plan) {
      return err(HRM_ERROR_CODES.SUCCESSION_PLAN_NOT_FOUND, "Succession plan not found", {
        successionPlanId: input.successionPlanId,
      });
    }

    if (plan.status === "closed") {
      return err(HRM_ERROR_CODES.CONFLICT, "Cannot nominate successors for closed succession plan", {
        successionPlanId: input.successionPlanId,
      });
    }

    const [employment] = await db
      .select({ id: hrmEmploymentRecords.id })
      .from(hrmEmploymentRecords)
      .where(
        and(
          eq(hrmEmploymentRecords.orgId, orgId),
          eq(hrmEmploymentRecords.id, input.employmentId),
        ),
      );

    if (!employment) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    const [existing] = await db
      .select({ id: hrmSuccessorNominations.id })
      .from(hrmSuccessorNominations)
      .where(
        and(
          eq(hrmSuccessorNominations.orgId, orgId),
          eq(hrmSuccessorNominations.successionPlanId, input.successionPlanId),
          eq(hrmSuccessorNominations.employmentId, input.employmentId),
        ),
      );

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Employee already nominated for this succession plan", {
        successionPlanId: input.successionPlanId,
        employmentId: input.employmentId,
      });
    }

    const [row] = await db
      .insert(hrmSuccessorNominations)
      .values({
        orgId,
        successionPlanId: input.successionPlanId,
        employmentId: input.employmentId,
        readinessLevel: input.readinessLevel,
      })
      .returning({ id: hrmSuccessorNominations.id });

    if (!row) {
      throw new Error("Failed to nominate successor");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.SUCCESSOR_NOMINATED,
      entityType: "hrm_successor_nomination",
      entityId: row.id,
      correlationId,
      details: {
        successorNominationId: row.id,
        successionPlanId: input.successionPlanId,
        employmentId: input.employmentId,
        readinessLevel: input.readinessLevel,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.SUCCESSOR_NOMINATED",
      version: "1",
      correlationId,
      payload: {
        successorNominationId: row.id,
        successionPlanId: input.successionPlanId,
        employmentId: input.employmentId,
      },
    });

    return ok({ successorNominationId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to nominate successor", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
