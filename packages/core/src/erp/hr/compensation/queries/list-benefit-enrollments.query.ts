import type { DbClient } from "@afenda/db";
import { hrmBenefitEnrollments } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export async function listBenefitEnrollments(
  db: DbClient,
  orgId: string,
  params?: {
    employmentId?: string;
    enrollmentStatus?: string;
    limit?: number;
    offset?: number;
  },
) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  const conditions = [eq(hrmBenefitEnrollments.orgId, orgId)];
  if (params?.employmentId) {
    conditions.push(eq(hrmBenefitEnrollments.employmentId, params.employmentId));
  }
  if (params?.enrollmentStatus) {
    conditions.push(eq(hrmBenefitEnrollments.enrollmentStatus, params.enrollmentStatus));
  }

  const rows = await db
    .select({
      id: hrmBenefitEnrollments.id,
      employmentId: hrmBenefitEnrollments.employmentId,
      benefitPlanId: hrmBenefitEnrollments.benefitPlanId,
      enrollmentStatus: hrmBenefitEnrollments.enrollmentStatus,
      enrolledAt: hrmBenefitEnrollments.enrolledAt,
      terminatedAt: hrmBenefitEnrollments.terminatedAt,
      createdAt: hrmBenefitEnrollments.createdAt,
    })
    .from(hrmBenefitEnrollments)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset);

  return { data: rows, limit, offset, total: rows.length };
}
