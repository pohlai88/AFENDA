import type { DbClient } from "@afenda/db";
import { hrmPositions, hrmSuccessionPlans } from "@afenda/db";
import { and, desc, eq, sql } from "drizzle-orm";

export interface ListSuccessionPlansParams {
  orgId: string;
  positionId?: string;
  status?: string;
  limit: number;
  offset: number;
}

export interface SuccessionPlanView {
  successionPlanId: string;
  positionId: string;
  positionTitle: string | null;
  criticalRoleFlag: boolean;
  status: string;
  createdAt: string;
}

export async function listSuccessionPlans(
  db: DbClient,
  params: ListSuccessionPlansParams,
): Promise<SuccessionPlanView[]> {
  const conditions = [eq(hrmSuccessionPlans.orgId, params.orgId)];

  if (params.positionId) {
    conditions.push(eq(hrmSuccessionPlans.positionId, params.positionId));
  }
  if (params.status) {
    conditions.push(eq(hrmSuccessionPlans.status, params.status));
  }

  const rows = await db
    .select({
      successionPlanId: hrmSuccessionPlans.id,
      positionId: hrmSuccessionPlans.positionId,
      positionTitle: hrmPositions.positionTitle,
      criticalRoleFlag: hrmSuccessionPlans.criticalRoleFlag,
      status: hrmSuccessionPlans.status,
      createdAt: hrmSuccessionPlans.createdAt,
    })
    .from(hrmSuccessionPlans)
    .innerJoin(hrmPositions, eq(hrmSuccessionPlans.positionId, hrmPositions.id))
    .where(and(...conditions))
    .orderBy(desc(hrmSuccessionPlans.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  return rows.map((r) => ({
    successionPlanId: r.successionPlanId,
    positionId: r.positionId,
    positionTitle: r.positionTitle,
    criticalRoleFlag: r.criticalRoleFlag,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function countSuccessionPlans(
  db: DbClient,
  params: Omit<ListSuccessionPlansParams, "limit" | "offset">,
): Promise<number> {
  const conditions = [eq(hrmSuccessionPlans.orgId, params.orgId)];

  if (params.positionId) {
    conditions.push(eq(hrmSuccessionPlans.positionId, params.positionId));
  }
  if (params.status) {
    conditions.push(eq(hrmSuccessionPlans.status, params.status));
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hrmSuccessionPlans)
    .where(and(...conditions));

  return result?.count ?? 0;
}
