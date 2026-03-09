/**
 * Receipt read queries — list and get-by-id.
 */
import type { DbClient } from "@afenda/db";
import { receipt } from "@afenda/db";
import { eq, and, gt, asc } from "drizzle-orm";
import type { OrgId, ReceiptId, ReceiptStatus } from "@afenda/contracts";
import type { CursorPage } from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";

export interface ReceiptRow {
  id: string;
  orgId: string;
  purchaseOrderId: string;
  receiptNumber: string;
  amountMinor: bigint;
  currencyCode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptListParams {
  cursor?: string;
  limit?: number;
  status?: ReceiptStatus;
  purchaseOrderId?: string;
}

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

function mapRow(row: {
  id: string;
  orgId: string;
  purchaseOrderId: string;
  receiptNumber: string;
  amountMinor: bigint;
  currencyCode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ReceiptRow {
  return {
    id: row.id,
    orgId: row.orgId,
    purchaseOrderId: row.purchaseOrderId,
    receiptNumber: row.receiptNumber,
    amountMinor: row.amountMinor,
    currencyCode: row.currencyCode,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listReceipts(
  db: DbClient,
  orgId: OrgId,
  params: ReceiptListParams = {},
): Promise<CursorPage<ReceiptRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(receipt.orgId, orgId)];

  if (params.status) conditions.push(eq(receipt.status, params.status));
  if (params.purchaseOrderId)
    conditions.push(eq(receipt.purchaseOrderId, params.purchaseOrderId));
  if (params.cursor) conditions.push(gt(receipt.id, decodeCursor(params.cursor)));

  const rows = await db
    .select()
    .from(receipt)
    .where(and(...conditions))
    .orderBy(asc(receipt.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map(mapRow),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getReceiptById(
  db: DbClient,
  orgId: OrgId,
  receiptId: ReceiptId,
): Promise<ReceiptRow | null> {
  const [row] = await db
    .select()
    .from(receipt)
    .where(and(eq(receipt.orgId, orgId), eq(receipt.id, receiptId)))
    .limit(1);

  return row ? mapRow(row) : null;
}
