import type { DbClient } from "@afenda/db";
import { auditLog, hrmPerformanceGoals, hrmPerformanceReviews, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateGoalInput {
  performanceReviewId: string;
  goalText: string;
  targetDate?: string | null;
}

export interface CreateGoalOutput {
  goalId: string;
}

export async function createGoal(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateGoalInput,
): Promise<HrmResult<CreateGoalOutput>> {
  if (!input.performanceReviewId || !input.goalText) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "performanceReviewId and goalText are required");
  }

  try {
    const [review] = await db
      .select({ id: hrmPerformanceReviews.id, status: hrmPerformanceReviews.status })
      .from(hrmPerformanceReviews)
      .where(
        and(
          eq(hrmPerformanceReviews.orgId, orgId),
          eq(hrmPerformanceReviews.id, input.performanceReviewId),
        ),
      );

    if (!review) {
      return err(HRM_ERROR_CODES.PERFORMANCE_REVIEW_NOT_FOUND, "Performance review not found", {
        performanceReviewId: input.performanceReviewId,
      });
    }

    if (review.status === "completed") {
      return err(HRM_ERROR_CODES.CONFLICT, "Cannot add goals to completed review", {
        performanceReviewId: input.performanceReviewId,
      });
    }

    const [row] = await db
      .insert(hrmPerformanceGoals)
      .values({
        orgId,
        performanceReviewId: input.performanceReviewId,
        goalText: input.goalText,
        targetDate: input.targetDate ?? null,
        status: "draft",
      })
      .returning({
        id: hrmPerformanceGoals.id,
      });

    if (!row) {
      throw new Error("Failed to create goal");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.PERFORMANCE_GOAL_CREATED,
      entityType: "hrm_performance_goal",
      entityId: row.id,
      correlationId,
      details: {
        goalId: row.id,
        performanceReviewId: input.performanceReviewId,
        goalText: input.goalText,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.PERFORMANCE_GOAL_CREATED",
      version: "1",
      correlationId,
      payload: {
        goalId: row.id,
        performanceReviewId: input.performanceReviewId,
      },
    });

    return ok({
      goalId: row.id,
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create goal", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
