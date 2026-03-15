import type { DbClient } from "@afenda/db";
import { auditLog, hrmPerformanceReviews, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CompleteManagerReviewInput {
  performanceReviewId: string;
  overallRating: string;
}

export interface CompleteManagerReviewOutput {
  performanceReviewId: string;
  status: string;
}

export async function completeManagerReview(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CompleteManagerReviewInput,
): Promise<HrmResult<CompleteManagerReviewOutput>> {
  if (!input.performanceReviewId || !input.overallRating) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "performanceReviewId and overallRating are required");
  }

  try {
    const [review] = await db
      .select({
        id: hrmPerformanceReviews.id,
        status: hrmPerformanceReviews.status,
      })
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

    if (review.status !== "self_submitted" && review.status !== "manager_review") {
      return err(HRM_ERROR_CODES.CONFLICT, "Manager review can only be completed after self submission", {
        performanceReviewId: input.performanceReviewId,
        currentStatus: review.status,
      });
    }

    await db
      .update(hrmPerformanceReviews)
      .set({
        status: "completed",
        overallRating: input.overallRating,
        managerCompletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hrmPerformanceReviews.orgId, orgId),
          eq(hrmPerformanceReviews.id, input.performanceReviewId),
        ),
      );

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.MANAGER_REVIEW_COMPLETED,
      entityType: "hrm_performance_review",
      entityId: input.performanceReviewId,
      correlationId,
      details: {
        performanceReviewId: input.performanceReviewId,
        previousStatus: review.status,
        newStatus: "completed",
        overallRating: input.overallRating,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.MANAGER_REVIEW_COMPLETED",
      version: "1",
      correlationId,
      payload: {
        performanceReviewId: input.performanceReviewId,
        status: "completed",
        overallRating: input.overallRating,
      },
    });

    return ok({
      performanceReviewId: input.performanceReviewId,
      status: "completed",
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to complete manager review", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
