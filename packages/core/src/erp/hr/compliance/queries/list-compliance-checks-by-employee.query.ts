import type { DbClient } from "@afenda/db";
import { hrmComplianceChecks } from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export interface ListComplianceChecksByEmployeeParams {
  orgId: string;
  employmentId: string;
  checkType?: string;
  status?: string;
  limit: number;
  offset: number;
}

export interface ComplianceCheckView {
  complianceCheckId: string;
  employmentId: string;
  checkType: string;
  checkDate: string;
  dueDate: string | null;
  status: string;
  createdAt: string;
}

export async function listComplianceChecksByEmployee(
  db: DbClient,
  params: ListComplianceChecksByEmployeeParams,
): Promise<ComplianceCheckView[]> {
  const conditions = [
    eq(hrmComplianceChecks.orgId, params.orgId),
    eq(hrmComplianceChecks.employmentId, params.employmentId),
  ];
  if (params.checkType) {
    conditions.push(eq(hrmComplianceChecks.checkType, params.checkType));
  }
  if (params.status) {
    conditions.push(eq(hrmComplianceChecks.status, params.status));
  }

  const rows = await db
    .select({
      complianceCheckId: hrmComplianceChecks.id,
      employmentId: hrmComplianceChecks.employmentId,
      checkType: hrmComplianceChecks.checkType,
      checkDate: hrmComplianceChecks.checkDate,
      dueDate: hrmComplianceChecks.dueDate,
      status: hrmComplianceChecks.status,
      createdAt: hrmComplianceChecks.createdAt,
    })
    .from(hrmComplianceChecks)
    .where(and(...conditions))
    .orderBy(desc(hrmComplianceChecks.checkDate))
    .limit(params.limit)
    .offset(params.offset);

  return rows.map((r) => ({
    complianceCheckId: r.complianceCheckId,
    employmentId: r.employmentId,
    checkType: r.checkType,
    checkDate: String(r.checkDate),
    dueDate: r.dueDate ? String(r.dueDate) : null,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}
