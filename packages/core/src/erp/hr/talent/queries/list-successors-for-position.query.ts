import type { DbClient } from "@afenda/db";
import {
  hrmEmploymentRecords,
  hrmPositions,
  hrmSuccessionPlans,
  hrmSuccessorNominations,
} from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export interface ListSuccessorsForPositionParams {
  orgId: string;
  positionId: string;
  successionPlanId?: string;
  limit: number;
  offset: number;
}

export interface SuccessorView {
  successorNominationId: string;
  successionPlanId: string;
  employmentId: string;
  employmentNumber: string;
  readinessLevel: string;
  createdAt: string;
}

export async function listSuccessorsForPosition(
  db: DbClient,
  params: ListSuccessorsForPositionParams,
): Promise<SuccessorView[]> {
  const planConditions = [
    eq(hrmSuccessionPlans.orgId, params.orgId),
    eq(hrmSuccessionPlans.positionId, params.positionId),
  ];

  if (params.successionPlanId) {
    planConditions.push(eq(hrmSuccessionPlans.id, params.successionPlanId));
  }

  const rows = await db
    .select({
      successorNominationId: hrmSuccessorNominations.id,
      successionPlanId: hrmSuccessorNominations.successionPlanId,
      employmentId: hrmSuccessorNominations.employmentId,
      employmentNumber: hrmEmploymentRecords.employmentNumber,
      readinessLevel: hrmSuccessorNominations.readinessLevel,
      createdAt: hrmSuccessorNominations.createdAt,
    })
    .from(hrmSuccessorNominations)
    .innerJoin(
      hrmSuccessionPlans,
      eq(hrmSuccessorNominations.successionPlanId, hrmSuccessionPlans.id),
    )
    .innerJoin(
      hrmEmploymentRecords,
      eq(hrmSuccessorNominations.employmentId, hrmEmploymentRecords.id),
    )
    .where(and(...planConditions))
    .orderBy(desc(hrmSuccessorNominations.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  return rows.map((r) => ({
    successorNominationId: r.successorNominationId,
    successionPlanId: r.successionPlanId,
    employmentId: r.employmentId,
    employmentNumber: r.employmentNumber,
    readinessLevel: r.readinessLevel,
    createdAt: r.createdAt.toISOString(),
  }));
}
