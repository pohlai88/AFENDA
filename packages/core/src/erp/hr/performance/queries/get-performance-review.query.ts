import type { DbClient } from "@afenda/db";
import {
  hrmPerformanceGoals,
  hrmPerformanceReviews,
  hrmReviewCycles,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface GetPerformanceReviewParams {
  orgId: string;
  performanceReviewId: string;
}

export interface PerformanceReviewView {
  performanceReviewId: string;
  employmentId: string;
  reviewCycleId: string;
  cycleCode: string;
  cycleName: string;
  reviewerEmploymentId: string | null;
  status: string;
  overallRating: string | null;
  selfSubmittedAt: string | null;
  managerCompletedAt: string | null;
  goals: { goalId: string; goalText: string; targetDate: string | null; status: string }[];
}

export async function getPerformanceReview(
  db: DbClient,
  params: GetPerformanceReviewParams,
): Promise<PerformanceReviewView | null> {
  const rows = await db
    .select({
      performanceReviewId: hrmPerformanceReviews.id,
      employmentId: hrmPerformanceReviews.employmentId,
      reviewCycleId: hrmPerformanceReviews.reviewCycleId,
      cycleCode: hrmReviewCycles.cycleCode,
      cycleName: hrmReviewCycles.cycleName,
      reviewerEmploymentId: hrmPerformanceReviews.reviewerEmploymentId,
      status: hrmPerformanceReviews.status,
      overallRating: hrmPerformanceReviews.overallRating,
      selfSubmittedAt: hrmPerformanceReviews.selfSubmittedAt,
      managerCompletedAt: hrmPerformanceReviews.managerCompletedAt,
    })
    .from(hrmPerformanceReviews)
    .innerJoin(
      hrmReviewCycles,
      eq(hrmPerformanceReviews.reviewCycleId, hrmReviewCycles.id),
    )
    .where(
      and(
        eq(hrmPerformanceReviews.orgId, params.orgId),
        eq(hrmPerformanceReviews.id, params.performanceReviewId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const goals = await db
    .select({
      goalId: hrmPerformanceGoals.id,
      goalText: hrmPerformanceGoals.goalText,
      targetDate: hrmPerformanceGoals.targetDate,
      status: hrmPerformanceGoals.status,
    })
    .from(hrmPerformanceGoals)
    .where(
      and(
        eq(hrmPerformanceGoals.orgId, params.orgId),
        eq(hrmPerformanceGoals.performanceReviewId, row.performanceReviewId),
      ),
    );

  return {
    performanceReviewId: row.performanceReviewId,
    employmentId: row.employmentId,
    reviewCycleId: row.reviewCycleId,
    cycleCode: row.cycleCode,
    cycleName: row.cycleName,
    reviewerEmploymentId: row.reviewerEmploymentId,
    status: row.status,
    overallRating: row.overallRating,
    selfSubmittedAt: row.selfSubmittedAt ? row.selfSubmittedAt.toISOString() : null,
    managerCompletedAt: row.managerCompletedAt ? row.managerCompletedAt.toISOString() : null,
    goals: goals.map((g) => ({
      goalId: g.goalId,
      goalText: g.goalText,
      targetDate: g.targetDate ? String(g.targetDate) : null,
      status: g.status,
    })),
  };
}
