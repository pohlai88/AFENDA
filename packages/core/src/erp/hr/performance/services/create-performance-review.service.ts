import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmploymentRecords,
  hrmPerformanceReviews,
  hrmReviewCycles,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreatePerformanceReviewInput {
  employmentId: string;
  reviewCycleId: string;
  reviewerEmploymentId?: string | null;
}

export interface CreatePerformanceReviewOutput {
  performanceReviewId: string;
  status: string;
}

export async function createPerformanceReview(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreatePerformanceReviewInput,
): Promise<HrmResult<CreatePerformanceReviewOutput>> {
  if (!input.employmentId || !input.reviewCycleId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "employmentId and reviewCycleId are required");
  }

  try {
    const [cycle] = await db
      .select({ id: hrmReviewCycles.id, status: hrmReviewCycles.status })
      .from(hrmReviewCycles)
      .where(
        and(
          eq(hrmReviewCycles.orgId, orgId),
          eq(hrmReviewCycles.id, input.reviewCycleId),
        ),
      );

    if (!cycle) {
      return err(HRM_ERROR_CODES.REVIEW_CYCLE_NOT_FOUND, "Review cycle not found", {
        reviewCycleId: input.reviewCycleId,
      });
    }

    if (cycle.status !== "draft" && cycle.status !== "active") {
      return err(HRM_ERROR_CODES.CONFLICT, "Review cycle is not open for reviews", {
        reviewCycleId: input.reviewCycleId,
        status: cycle.status,
      });
    }

    const [employment] = await db
      .select({ id: hrmEmploymentRecords.id })
      .from(hrmEmploymentRecords)
      .where(
        and(
          eq(hrmEmploymentRecords.orgId, orgId),
          eq(hrmEmploymentRecords.id, input.employmentId),
        ),
      );

    if (!employment) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    const [existing] = await db
      .select({ id: hrmPerformanceReviews.id })
      .from(hrmPerformanceReviews)
      .where(
        and(
          eq(hrmPerformanceReviews.orgId, orgId),
          eq(hrmPerformanceReviews.employmentId, input.employmentId),
          eq(hrmPerformanceReviews.reviewCycleId, input.reviewCycleId),
        ),
      );

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Performance review already exists for this employee and cycle", {
        employmentId: input.employmentId,
        reviewCycleId: input.reviewCycleId,
      });
    }

    const [row] = await db
      .insert(hrmPerformanceReviews)
      .values({
        orgId,
        employmentId: input.employmentId,
        reviewCycleId: input.reviewCycleId,
        reviewerEmploymentId: input.reviewerEmploymentId ?? null,
        status: "draft",
      })
      .returning({
        id: hrmPerformanceReviews.id,
        status: hrmPerformanceReviews.status,
      });

    if (!row) {
      throw new Error("Failed to create performance review");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.PERFORMANCE_REVIEW_CREATED,
      entityType: "hrm_performance_review",
      entityId: row.id,
      correlationId,
      details: {
        performanceReviewId: row.id,
        employmentId: input.employmentId,
        reviewCycleId: input.reviewCycleId,
        status: row.status,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.PERFORMANCE_REVIEW_CREATED",
      version: "1",
      correlationId,
      payload: {
        performanceReviewId: row.id,
        employmentId: input.employmentId,
        reviewCycleId: input.reviewCycleId,
        status: row.status,
      },
    });

    return ok({
      performanceReviewId: row.id,
      status: row.status,
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create performance review", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
