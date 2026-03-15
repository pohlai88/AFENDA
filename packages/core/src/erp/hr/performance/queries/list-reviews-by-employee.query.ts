import type { DbClient } from "@afenda/db";
import { hrmPerformanceReviews, hrmReviewCycles } from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export interface ListReviewsByEmployeeParams {
  orgId: string;
  employmentId: string;
  reviewCycleId?: string;
  limit?: number;
  offset?: number;
}

export interface PerformanceReviewListItem {
  performanceReviewId: string;
  reviewCycleId: string;
  cycleCode: string;
  cycleName: string;
  status: string;
  overallRating: string | null;
}

export interface ListReviewsByEmployeeResult {
  items: PerformanceReviewListItem[];
  limit: number;
  offset: number;
}

export async function listReviewsByEmployee(
  db: DbClient,
  params: ListReviewsByEmployeeParams,
): Promise<ListReviewsByEmployeeResult> {
  const limit = Math.min(params.limit ?? 25, 100);
  const offset = Math.max(params.offset ?? 0, 0);

  const whereConditions = [
    eq(hrmPerformanceReviews.orgId, params.orgId),
    eq(hrmPerformanceReviews.employmentId, params.employmentId),
  ];
  if (params.reviewCycleId) {
    whereConditions.push(eq(hrmPerformanceReviews.reviewCycleId, params.reviewCycleId));
  }

  const rows = await db
    .select({
      performanceReviewId: hrmPerformanceReviews.id,
      reviewCycleId: hrmPerformanceReviews.reviewCycleId,
      cycleCode: hrmReviewCycles.cycleCode,
      cycleName: hrmReviewCycles.cycleName,
      status: hrmPerformanceReviews.status,
      overallRating: hrmPerformanceReviews.overallRating,
    })
    .from(hrmPerformanceReviews)
    .innerJoin(
      hrmReviewCycles,
      eq(hrmPerformanceReviews.reviewCycleId, hrmReviewCycles.id),
    )
    .where(and(...whereConditions))
    .orderBy(desc(hrmReviewCycles.startDate))
    .limit(limit)
    .offset(offset);

  const items: PerformanceReviewListItem[] = rows.map((r) => ({
    performanceReviewId: r.performanceReviewId,
    reviewCycleId: r.reviewCycleId,
    cycleCode: r.cycleCode,
    cycleName: r.cycleName,
    status: r.status,
    overallRating: r.overallRating,
  }));

  return {
    items,
    limit,
    offset,
  };
}
