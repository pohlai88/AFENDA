/**
 * Purchase Order read queries — list and get-by-id.
 */
import type { DbClient } from "@afenda/db";
import { purchaseOrder } from "@afenda/db";
import { eq, and, gt, asc } from "drizzle-orm";
import type { OrgId, PurchaseOrderId, PurchaseOrderStatus } from "@afenda/contracts";
import type { CursorPage } from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseOrderRow {
  id: string;
  orgId: string;
  supplierId: string;
  poNumber: string;
  amountMinor: bigint;
  currencyCode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderListParams {
  cursor?: string;
  limit?: number;
  status?: PurchaseOrderStatus;
}

// ── Cursor helpers ─────────────────────────────────────────────────────────────

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

function mapRow(row: {
  id: string;
  orgId: string;
  supplierId: string;
  poNumber: string;
  amountMinor: bigint;
  currencyCode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): PurchaseOrderRow {
  return {
    id: row.id,
    orgId: row.orgId,
    supplierId: row.supplierId,
    poNumber: row.poNumber,
    amountMinor: row.amountMinor,
    currencyCode: row.currencyCode,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listPurchaseOrders(
  db: DbClient,
  orgId: OrgId,
  params: PurchaseOrderListParams = {},
): Promise<CursorPage<PurchaseOrderRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(purchaseOrder.orgId, orgId)];

  if (params.status) {
    conditions.push(eq(purchaseOrder.status, params.status));
  }

  if (params.cursor) {
    const cursorId = decodeCursor(params.cursor);
    conditions.push(gt(purchaseOrder.id, cursorId));
  }

  const rows = await db
    .select()
    .from(purchaseOrder)
    .where(and(...conditions))
    .orderBy(asc(purchaseOrder.id))
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

// ── Get by ID ─────────────────────────────────────────────────────────────────

export async function getPurchaseOrderById(
  db: DbClient,
  orgId: OrgId,
  purchaseOrderId: PurchaseOrderId,
): Promise<PurchaseOrderRow | null> {
  const [row] = await db
    .select()
    .from(purchaseOrder)
    .where(
      and(
        eq(purchaseOrder.orgId, orgId),
        eq(purchaseOrder.id, purchaseOrderId),
      ),
    )
    .limit(1);

  return row ? mapRow(row) : null;
}
