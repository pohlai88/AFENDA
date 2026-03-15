import type { DbClient } from "@afenda/db";
import { hrmComplianceChecks } from "@afenda/db";
import { and, asc, eq, isNotNull, lt, sql } from "drizzle-orm";

export interface ListOverdueComplianceChecksParams {
  orgId: string;
  limit: number;
  offset: number;
}

export interface OverdueComplianceCheckView {
  complianceCheckId: string;
  employmentId: string;
  checkType: string;
  dueDate: string;
  status: string;
}

export async function listOverdueComplianceChecks(
  db: DbClient,
  params: ListOverdueComplianceChecksParams,
): Promise<OverdueComplianceCheckView[]> {
  const rows = await db
    .select({
      complianceCheckId: hrmComplianceChecks.id,
      employmentId: hrmComplianceChecks.employmentId,
      checkType: hrmComplianceChecks.checkType,
      dueDate: hrmComplianceChecks.dueDate,
      status: hrmComplianceChecks.status,
    })
    .from(hrmComplianceChecks)
    .where(
      and(
        eq(hrmComplianceChecks.orgId, params.orgId),
        isNotNull(hrmComplianceChecks.dueDate),
        lt(hrmComplianceChecks.dueDate, sql`CURRENT_DATE`),
        eq(hrmComplianceChecks.status, "pending"),
      ),
    )
    .orderBy(asc(hrmComplianceChecks.dueDate))
    .limit(params.limit)
    .offset(params.offset);

  return rows.map((r) => ({
    complianceCheckId: r.complianceCheckId,
    employmentId: r.employmentId,
    checkType: r.checkType,
    dueDate: String(r.dueDate),
    status: r.status,
  }));
}
