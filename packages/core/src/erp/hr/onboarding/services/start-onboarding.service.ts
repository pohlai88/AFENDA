import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { auditLog, hrmEmploymentRecords, hrmOnboardingPlans, hrmOnboardingTasks, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { StartOnboardingInput, StartOnboardingOutput } from "../dto/start-onboarding.dto";

function buildTaskCode(): string {
  return `ONB-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function startOnboarding(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: StartOnboardingInput,
): Promise<HrmResult<StartOnboardingOutput>> {
  const [employment] = await db.select({ id: hrmEmploymentRecords.id }).from(hrmEmploymentRecords).where(and(eq(hrmEmploymentRecords.orgId, orgId), eq(hrmEmploymentRecords.id, input.employmentId)));
  if (!employment) return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", { employmentId: input.employmentId });

  try {
    const data = await db.transaction(async (tx) => {
      const [plan] = await tx.insert(hrmOnboardingPlans).values({ orgId, employmentId: input.employmentId, templateId: input.templateId, planStatus: "open", startDate: input.startDate ? sql`${input.startDate}::date` : sql`now()::date`, targetCompletionDate: input.targetCompletionDate ? sql`${input.targetCompletionDate}::date` : undefined }).returning({ id: hrmOnboardingPlans.id });
      if (!plan) throw new Error("Failed to insert onboarding plan");

      const taskIds: string[] = [];
      for (const task of input.tasks ?? []) {
        const [row] = await tx.insert(hrmOnboardingTasks).values({ orgId, onboardingPlanId: plan.id, taskCode: task.taskCode ?? buildTaskCode(), taskTitle: task.taskTitle, ownerEmployeeId: task.ownerEmployeeId, dueDate: task.dueDate ? sql`${task.dueDate}::date` : undefined, taskStatus: "pending", mandatory: task.mandatory ?? true }).returning({ id: hrmOnboardingTasks.id });
        if (row) taskIds.push(row.id);
      }

      await tx.insert(auditLog).values({ orgId, actorPrincipalId: actorPrincipalId ?? null, action: HRM_EVENTS.ONBOARDING_STARTED, entityType: "hrm_onboarding_plan", entityId: plan.id, correlationId, details: { onboardingPlanId: plan.id, employmentId: input.employmentId, taskCount: taskIds.length } });
      await tx.insert(outboxEvent).values({ orgId, type: "HRM.ONBOARDING_STARTED", version: "1", correlationId, payload: { onboardingPlanId: plan.id, employmentId: input.employmentId, taskIds } });

      return { onboardingPlanId: plan.id, taskIds };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to start onboarding", { cause: error instanceof Error ? error.message : "unknown_error" });
  }
}