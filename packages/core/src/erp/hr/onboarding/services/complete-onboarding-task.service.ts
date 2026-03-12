import type { DbClient } from "@afenda/db";
import { auditLog, hrmOnboardingTasks, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { CompleteOnboardingTaskInput, CompleteOnboardingTaskOutput } from "../dto/complete-onboarding-task.dto";

export async function completeOnboardingTask(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CompleteOnboardingTaskInput,
): Promise<HrmResult<CompleteOnboardingTaskOutput>> {
  const [task] = await db.select({ id: hrmOnboardingTasks.id, taskStatus: hrmOnboardingTasks.taskStatus }).from(hrmOnboardingTasks).where(and(eq(hrmOnboardingTasks.orgId, orgId), eq(hrmOnboardingTasks.id, input.onboardingTaskId)));
  if (!task) return err(HRM_ERROR_CODES.ONBOARDING_TASK_NOT_FOUND, "Onboarding task not found", { onboardingTaskId: input.onboardingTaskId });

  try {
    const data = await db.transaction(async (tx) => {
      await tx.update(hrmOnboardingTasks).set({ taskStatus: "completed", completedAt: sql`${input.completedAt}::date`, updatedAt: sql`now()` }).where(and(eq(hrmOnboardingTasks.orgId, orgId), eq(hrmOnboardingTasks.id, input.onboardingTaskId)));
      const payload = { onboardingTaskId: input.onboardingTaskId, status: "completed", completedAt: input.completedAt, previousStatus: task.taskStatus };
      await tx.insert(auditLog).values({ orgId, actorPrincipalId: actorPrincipalId ?? null, action: HRM_EVENTS.ONBOARDING_TASK_COMPLETED, entityType: "hrm_onboarding_task", entityId: input.onboardingTaskId, correlationId, details: payload });
      await tx.insert(outboxEvent).values({ orgId, type: "HRM.ONBOARDING_TASK_COMPLETED", version: "1", correlationId, payload });
      return payload;
    });
    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to complete onboarding task", { cause: error instanceof Error ? error.message : "unknown_error" });
  }
}