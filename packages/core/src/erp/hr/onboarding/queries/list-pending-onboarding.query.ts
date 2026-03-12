import type { DbClient } from "@afenda/db";
import { hrmOnboardingPlans, hrmOnboardingTasks } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";

export interface PendingOnboardingItem {
  onboardingPlanId: string;
  employmentId: string;
  planStatus: string;
  startDate: string | null;
  targetCompletionDate: string | null;
  pendingMandatoryTasks: number;
  pendingTasks: number;
}

export async function listPendingOnboarding(
  db: DbClient,
  orgId: string,
): Promise<PendingOnboardingItem[]> {
  const rows = await db
    .select({
      onboardingPlanId: hrmOnboardingPlans.id,
      employmentId: hrmOnboardingPlans.employmentId,
      planStatus: hrmOnboardingPlans.planStatus,
      startDate: hrmOnboardingPlans.startDate,
      targetCompletionDate: hrmOnboardingPlans.targetCompletionDate,
      pendingMandatoryTasks:
        sql<number>`sum(case when ${hrmOnboardingTasks.mandatory} = true and ${hrmOnboardingTasks.taskStatus} <> 'completed' then 1 else 0 end)`,
      pendingTasks:
        sql<number>`sum(case when ${hrmOnboardingTasks.taskStatus} <> 'completed' then 1 else 0 end)`,
    })
    .from(hrmOnboardingPlans)
    .leftJoin(
      hrmOnboardingTasks,
      and(
        eq(hrmOnboardingTasks.orgId, hrmOnboardingPlans.orgId),
        eq(hrmOnboardingTasks.onboardingPlanId, hrmOnboardingPlans.id),
      ),
    )
    .where(and(eq(hrmOnboardingPlans.orgId, orgId), sql`${hrmOnboardingPlans.planStatus} <> 'completed'`))
    .groupBy(
      hrmOnboardingPlans.id,
      hrmOnboardingPlans.employmentId,
      hrmOnboardingPlans.planStatus,
      hrmOnboardingPlans.startDate,
      hrmOnboardingPlans.targetCompletionDate,
    );

  return rows.map((row) => ({
    onboardingPlanId: row.onboardingPlanId,
    employmentId: row.employmentId,
    planStatus: row.planStatus,
    startDate: row.startDate ? String(row.startDate) : null,
    targetCompletionDate: row.targetCompletionDate ? String(row.targetCompletionDate) : null,
    pendingMandatoryTasks: Number(row.pendingMandatoryTasks ?? 0),
    pendingTasks: Number(row.pendingTasks ?? 0),
  }));
}