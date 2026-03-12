import type { DbClient } from "@afenda/db";
import { liquiditySourceFeed } from "@afenda/db";
import { and, asc, eq, lte } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";

export interface LiquiditySourceFeedRow {
  id: string;
  orgId: string;
  sourceType: string;
  sourceId: string;
  sourceDocumentNumber: string | null;
  bankAccountId: string | null;
  currencyCode: string;
  amountMinor: string;
  dueDate: string;
  direction: string;
  confidenceScore: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LiquiditySourceFeedListParams {
  status?: "open" | "consumed" | "cancelled";
  dueDateLte?: string;
}

export async function listLiquiditySourceFeeds(
  db: DbClient,
  orgId: OrgId,
  params: LiquiditySourceFeedListParams = {},
): Promise<LiquiditySourceFeedRow[]> {
  const conditions = [eq(liquiditySourceFeed.orgId, orgId)];

  if (params.status) {
    conditions.push(eq(liquiditySourceFeed.status, params.status));
  }

  if (params.dueDateLte) {
    conditions.push(lte(liquiditySourceFeed.dueDate, params.dueDateLte));
  }

  const rows = await db
    .select()
    .from(liquiditySourceFeed)
    .where(and(...conditions))
    .orderBy(asc(liquiditySourceFeed.dueDate), asc(liquiditySourceFeed.createdAt));

  return rows.map((r) => ({ ...r }));
}
