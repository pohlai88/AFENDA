import type { DbClient } from "@afenda/db";
import { treasuryPaymentBatch, treasuryPaymentBatchItem } from "@afenda/db";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX, type OrgId } from "@afenda/contracts";

export interface PaymentBatchRow {
  id: string;
  orgId: string;
  sourceBankAccountId: string;
  description: string | null;
  status: string;
  totalAmountMinor: string;
  itemCount: number;
  requestedReleaseAt: Date | null;
  approvedAt: Date | null;
  releasedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentBatchItemRow {
  id: string;
  orgId: string;
  batchId: string;
  paymentInstructionId: string;
  amountMinor: string;
  createdAt: Date;
}

export interface PaymentBatchListParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

export async function listPaymentBatches(
  db: DbClient,
  orgId: OrgId,
  params: PaymentBatchListParams = {},
): Promise<{ data: PaymentBatchRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(treasuryPaymentBatch.orgId, orgId)];

  if (params.status) {
    conditions.push(
      eq(
        treasuryPaymentBatch.status,
        params.status as "draft" | "pending_approval" | "approved" | "releasing" | "released" | "failed" | "cancelled",
      ),
    );
  }

  if (params.cursor) {
    conditions.push(gt(treasuryPaymentBatch.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(treasuryPaymentBatch)
    .where(and(...conditions))
    .orderBy(asc(treasuryPaymentBatch.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map((r) => ({ ...r })),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getPaymentBatchById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<PaymentBatchRow | null> {
  const [row] = await db
    .select()
    .from(treasuryPaymentBatch)
    .where(and(eq(treasuryPaymentBatch.orgId, orgId), eq(treasuryPaymentBatch.id, id)));

  return row ?? null;
}

export async function listPaymentBatchItems(
  db: DbClient,
  orgId: OrgId,
  batchId: string,
): Promise<PaymentBatchItemRow[]> {
  const rows = await db
    .select()
    .from(treasuryPaymentBatchItem)
    .where(
      and(
        eq(treasuryPaymentBatchItem.orgId, orgId),
        eq(treasuryPaymentBatchItem.batchId, batchId),
      ),
    )
    .orderBy(desc(treasuryPaymentBatchItem.createdAt));

  return rows.map((r) => ({ ...r }));
}
