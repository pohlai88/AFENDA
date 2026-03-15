import type { DbClient } from "@afenda/db";
import {
  hrmOrgUnits,
  hrmPositionBudgets,
  hrmPositions,
} from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";

export interface ListHeadcountByOrgParams {
  orgId: string;
  orgUnitId?: string;
  planYear: number;
}

export interface HeadcountByOrgView {
  orgUnitId: string;
  orgUnitName: string;
  positionId: string;
  positionTitle: string;
  approvedHeadcount: number;
  budgetAmount: string;
}

export async function listHeadcountByOrg(
  db: DbClient,
  params: ListHeadcountByOrgParams,
): Promise<HeadcountByOrgView[]> {
  const conditions = [
    eq(hrmPositionBudgets.orgId, params.orgId),
    eq(hrmPositionBudgets.planYear, params.planYear),
  ];
  if (params.orgUnitId) {
    conditions.push(eq(hrmPositionBudgets.orgUnitId, params.orgUnitId));
  }

  const rows = await db
    .select({
      orgUnitId: hrmPositionBudgets.orgUnitId,
      orgUnitName: hrmOrgUnits.orgUnitName,
      positionId: hrmPositionBudgets.positionId,
      positionTitle: hrmPositions.positionTitle,
      approvedHeadcount: hrmPositionBudgets.approvedHeadcount,
      budgetAmount: hrmPositionBudgets.budgetAmount,
    })
    .from(hrmPositionBudgets)
    .innerJoin(
      hrmOrgUnits,
      eq(hrmPositionBudgets.orgUnitId, hrmOrgUnits.id),
    )
    .innerJoin(
      hrmPositions,
      eq(hrmPositionBudgets.positionId, hrmPositions.id),
    )
    .where(and(...conditions))
    .orderBy(asc(hrmOrgUnits.orgUnitName), asc(hrmPositions.positionTitle));

  return rows.map((r) => ({
    orgUnitId: r.orgUnitId,
    orgUnitName: r.orgUnitName,
    positionId: r.positionId,
    positionTitle: r.positionTitle,
    approvedHeadcount: r.approvedHeadcount,
    budgetAmount: String(r.budgetAmount),
  }));
}
