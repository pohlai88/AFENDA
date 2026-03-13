import type { DbClient } from "@afenda/db";
import { hrmEmployeeCompensationPackages } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export async function listCompensationPackages(
  db: DbClient,
  orgId: string,
  params?: {
    employmentId?: string;
    currentOnly?: boolean;
    limit?: number;
    offset?: number;
  },
) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  const conditions = [eq(hrmEmployeeCompensationPackages.orgId, orgId)];
  if (params?.employmentId) {
    conditions.push(eq(hrmEmployeeCompensationPackages.employmentId, params.employmentId));
  }
  if (params?.currentOnly !== false) {
    conditions.push(eq(hrmEmployeeCompensationPackages.isCurrent, true));
  }

  const rows = await db
    .select({
      id: hrmEmployeeCompensationPackages.id,
      employmentId: hrmEmployeeCompensationPackages.employmentId,
      compensationStructureId: hrmEmployeeCompensationPackages.compensationStructureId,
      salaryAmount: hrmEmployeeCompensationPackages.salaryAmount,
      effectiveFrom: hrmEmployeeCompensationPackages.effectiveFrom,
      effectiveTo: hrmEmployeeCompensationPackages.effectiveTo,
      isCurrent: hrmEmployeeCompensationPackages.isCurrent,
      changeReason: hrmEmployeeCompensationPackages.changeReason,
      createdAt: hrmEmployeeCompensationPackages.createdAt,
    })
    .from(hrmEmployeeCompensationPackages)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset);

  return { data: rows, limit, offset, total: rows.length };
}
