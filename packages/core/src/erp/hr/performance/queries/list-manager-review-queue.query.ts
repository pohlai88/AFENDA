import type { DbClient } from "@afenda/db";
import { hrmPerformanceReviews, hrmReviewCycles } from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export interface ListManagerReviewQueueParams {
  orgId: string;
  reviewerEmploymentId: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ManagerReviewQueueItem {
  performanceReviewId: string;
  employmentId: string;
  reviewCycleId: string;
  cycleCode: string;
  cycleName: string;
  status: string;
}

export interface ListManagerReviewQueueResult {
  items: ManagerReviewQueueItem[];
  limit: number;
  offset: number;
}

export async function listManagerReviewQueue(
  db: DbClient,
  params: ListManagerReviewQueueParams,
): Promise<ListManagerReviewQueueResult> {
  const limit = Math.min(params.limit ?? 25, 100);
  const offset = Math.max(params.offset ?? 0, 0);

  const whereConditions = [
    eq(hrmPerformanceReviews.orgId, params.orgId),
    eq(hrmPerformanceReviews.reviewerEmploymentId, params.reviewerEmploymentId),
  ];
  if (params.status) {
    whereConditions.push(eq(hrmPerformanceReviews.status, params.status));
  }

  const rows = await db
    .select({
      performanceReviewId: hrmPerformanceReviews.id,
      employmentId: hrmPerformanceReviews.employmentId,
      reviewCycleId: hrmPerformanceReviews.reviewCycleId,
      cycleCode: hrmReviewCycles.cycleCode,
      cycleName: hrmReviewCycles.cycleName,
      status: hrmPerformanceReviews.status,
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

  const items: ManagerReviewQueueItem[] = rows.map((r) => ({
    performanceReviewId: r.performanceReviewId,
    employmentId: r.employmentId,
    reviewCycleId: r.reviewCycleId,
    cycleCode: r.cycleCode,
    cycleName: r.cycleName,
    status: r.status,
  }));

  return {
    items,
    limit,
    offset,
  };
}
