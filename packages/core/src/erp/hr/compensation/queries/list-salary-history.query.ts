import type { DbClient } from "@afenda/db";
import { hrmSalaryChangeHistory } from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export async function listSalaryHistory(
  db: DbClient,
  orgId: string,
  params?: {
    employmentId?: string;
    limit?: number;
    offset?: number;
  },
) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  const conditions = [eq(hrmSalaryChangeHistory.orgId, orgId)];
  if (params?.employmentId) {
    conditions.push(eq(hrmSalaryChangeHistory.employmentId, params.employmentId));
  }

  const rows = await db
    .select({
      id: hrmSalaryChangeHistory.id,
      employmentId: hrmSalaryChangeHistory.employmentId,
      compensationStructureId: hrmSalaryChangeHistory.compensationStructureId,
      previousAmount: hrmSalaryChangeHistory.previousAmount,
      newAmount: hrmSalaryChangeHistory.newAmount,
      effectiveFrom: hrmSalaryChangeHistory.effectiveFrom,
      changeReason: hrmSalaryChangeHistory.changeReason,
      recordedBy: hrmSalaryChangeHistory.recordedBy,
      createdAt: hrmSalaryChangeHistory.createdAt,
    })
    .from(hrmSalaryChangeHistory)
    .where(and(...conditions))
    .orderBy(desc(hrmSalaryChangeHistory.effectiveFrom))
    .limit(limit)
    .offset(offset);

  return { data: rows, limit, offset, total: rows.length };
}
