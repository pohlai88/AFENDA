import type { DbClient } from "@afenda/db";
import { hrmReviewCycles } from "@afenda/db";
import { and, desc, eq, sql } from "drizzle-orm";

export interface ListReviewCyclesParams {
  orgId: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ReviewCycleItem {
  reviewCycleId: string;
  cycleCode: string;
  cycleName: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface ListReviewCyclesResult {
  items: ReviewCycleItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listReviewCycles(
  db: DbClient,
  params: ListReviewCyclesParams,
): Promise<ListReviewCyclesResult> {
  const limit = Math.min(params.limit ?? 25, 100);
  const offset = Math.max(params.offset ?? 0, 0);

  const whereConditions = [eq(hrmReviewCycles.orgId, params.orgId)];
  if (params.status) {
    whereConditions.push(eq(hrmReviewCycles.status, params.status));
  }

  const countRows = await db
    .select({ total: sql`count(*)` })
    .from(hrmReviewCycles)
    .where(and(...whereConditions));

  const rows = await db
    .select({
      reviewCycleId: hrmReviewCycles.id,
      cycleCode: hrmReviewCycles.cycleCode,
      cycleName: hrmReviewCycles.cycleName,
      startDate: hrmReviewCycles.startDate,
      endDate: hrmReviewCycles.endDate,
      status: hrmReviewCycles.status,
    })
    .from(hrmReviewCycles)
    .where(and(...whereConditions))
    .orderBy(desc(hrmReviewCycles.startDate))
    .limit(limit)
    .offset(offset);

  const items: ReviewCycleItem[] = rows.map((r) => ({
    reviewCycleId: r.reviewCycleId,
    cycleCode: r.cycleCode,
    cycleName: r.cycleName,
    startDate: String(r.startDate),
    endDate: String(r.endDate),
    status: r.status,
  }));

  return {
    items,
    total: Number(countRows[0]?.total ?? 0),
    limit,
    offset,
  };
}
