import type { DbClient } from "@afenda/db";
import { auditLog, hrmPerformanceReviews, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface SubmitSelfReviewInput {
  performanceReviewId: string;
}

export interface SubmitSelfReviewOutput {
  performanceReviewId: string;
  status: string;
}

export async function submitSelfReview(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: SubmitSelfReviewInput,
): Promise<HrmResult<SubmitSelfReviewOutput>> {
  if (!input.performanceReviewId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "performanceReviewId is required");
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

    if (review.status !== "draft") {
      return err(HRM_ERROR_CODES.CONFLICT, "Self review can only be submitted from draft status", {
        performanceReviewId: input.performanceReviewId,
        currentStatus: review.status,
      });
    }

    await db
      .update(hrmPerformanceReviews)
      .set({
        status: "self_submitted",
        selfSubmittedAt: sql`now()`,
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
      action: HRM_EVENTS.SELF_REVIEW_SUBMITTED,
      entityType: "hrm_performance_review",
      entityId: input.performanceReviewId,
      correlationId,
      details: {
        performanceReviewId: input.performanceReviewId,
        previousStatus: review.status,
        newStatus: "self_submitted",
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.SELF_REVIEW_SUBMITTED",
      version: "1",
      correlationId,
      payload: {
        performanceReviewId: input.performanceReviewId,
        status: "self_submitted",
      },
    });

    return ok({
      performanceReviewId: input.performanceReviewId,
      status: "self_submitted",
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to submit self review", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
