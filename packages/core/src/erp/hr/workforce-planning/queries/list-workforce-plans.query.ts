import type { DbClient } from "@afenda/db";
import { hrmWorkforcePlans } from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export interface ListWorkforcePlansParams {
  orgId: string;
  planYear?: number;
}

export interface WorkforcePlanView {
  id: string;
  planCode: string;
  planName: string;
  planYear: number;
  status: string;
}

export async function listWorkforcePlans(
  db: DbClient,
  params: ListWorkforcePlansParams,
): Promise<WorkforcePlanView[]> {
  const conditions = [eq(hrmWorkforcePlans.orgId, params.orgId)];
  if (params.planYear != null) {
    conditions.push(eq(hrmWorkforcePlans.planYear, params.planYear));
  }

  const rows = await db
    .select()
    .from(hrmWorkforcePlans)
    .where(and(...conditions))
    .orderBy(desc(hrmWorkforcePlans.planYear), desc(hrmWorkforcePlans.createdAt));

  return rows.map((r) => ({
    id: r.id,
    planCode: r.planCode,
    planName: r.planName,
    planYear: r.planYear,
    status: r.status,
  }));
}
