import type { DbClient } from "@afenda/db";
import { hrmOnboardingPlans, hrmOnboardingTasks } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface OnboardingChecklistTask {
  taskId: string;
  taskCode: string | null;
  taskTitle: string;
  ownerEmployeeId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  taskStatus: string;
  mandatory: boolean;
}

export interface OnboardingChecklist {
  onboardingPlanId: string;
  employmentId: string;
  planStatus: string;
  startDate: string | null;
  targetCompletionDate: string | null;
  completedAt: string | null;
  tasks: OnboardingChecklistTask[];
}

export async function getOnboardingChecklist(
  db: DbClient,
  orgId: string,
  onboardingPlanId: string,
): Promise<OnboardingChecklist | null> {
  const [plan] = await db
    .select({
      onboardingPlanId: hrmOnboardingPlans.id,
      employmentId: hrmOnboardingPlans.employmentId,
      planStatus: hrmOnboardingPlans.planStatus,
      startDate: hrmOnboardingPlans.startDate,
      targetCompletionDate: hrmOnboardingPlans.targetCompletionDate,
      completedAt: hrmOnboardingPlans.completedAt,
    })
    .from(hrmOnboardingPlans)
    .where(and(eq(hrmOnboardingPlans.orgId, orgId), eq(hrmOnboardingPlans.id, onboardingPlanId)));

  if (!plan) {
    return null;
  }

  const tasks = await db
    .select({
      taskId: hrmOnboardingTasks.id,
      taskCode: hrmOnboardingTasks.taskCode,
      taskTitle: hrmOnboardingTasks.taskTitle,
      ownerEmployeeId: hrmOnboardingTasks.ownerEmployeeId,
      dueDate: hrmOnboardingTasks.dueDate,
      completedAt: hrmOnboardingTasks.completedAt,
      taskStatus: hrmOnboardingTasks.taskStatus,
      mandatory: hrmOnboardingTasks.mandatory,
    })
    .from(hrmOnboardingTasks)
    .where(
      and(
        eq(hrmOnboardingTasks.orgId, orgId),
        eq(hrmOnboardingTasks.onboardingPlanId, onboardingPlanId),
      ),
    );

  return {
    onboardingPlanId: plan.onboardingPlanId,
    employmentId: plan.employmentId,
    planStatus: plan.planStatus,
    startDate: plan.startDate ? String(plan.startDate) : null,
    targetCompletionDate: plan.targetCompletionDate ? String(plan.targetCompletionDate) : null,
    completedAt: plan.completedAt ? String(plan.completedAt) : null,
    tasks: tasks.map((task) => ({
      ...task,
      taskCode: task.taskCode ?? null,
      ownerEmployeeId: task.ownerEmployeeId ?? null,
      dueDate: task.dueDate ? String(task.dueDate) : null,
      completedAt: task.completedAt ? String(task.completedAt) : null,
    })),
  };
}