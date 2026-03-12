import type { DbClient } from "@afenda/db";
import { cashPositionSnapshot, cashPositionSnapshotLine } from "@afenda/db";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX, type OrgId } from "@afenda/contracts";

export interface CashPositionSnapshotRow {
  id: string;
  orgId: string;
  snapshotDate: string;
  asOfAt: string;
  baseCurrencyCode: string;
  status: string;
  sourceVersion: string;
  totalBookBalanceMinor: string;
  totalAvailableBalanceMinor: string;
  totalPendingInflowMinor: string;
  totalPendingOutflowMinor: string;
  totalProjectedAvailableMinor: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashPositionSnapshotLineRow {
  id: string;
  orgId: string;
  snapshotId: string;
  bankAccountId: string | null;
  currencyCode: string;
  bucketType: string;
  amountMinor: string;
  sourceType: string;
  sourceId: string | null;
  lineDescription: string | null;
  createdAt: Date;
}

export interface CashPositionSnapshotListParams {
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

export async function listCashPositionSnapshots(
  db: DbClient,
  orgId: OrgId,
  params: CashPositionSnapshotListParams = {},
): Promise<{ data: CashPositionSnapshotRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(cashPositionSnapshot.orgId, orgId)];

  if (params.status) {
    conditions.push(
      eq(
        cashPositionSnapshot.status,
        params.status as "draft" | "calculated" | "superseded",
      ),
    );
  }

  if (params.cursor) {
    conditions.push(gt(cashPositionSnapshot.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(cashPositionSnapshot)
    .where(and(...conditions))
    .orderBy(asc(cashPositionSnapshot.id))
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

export async function getCashPositionSnapshotById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<CashPositionSnapshotRow | null> {
  const [row] = await db
    .select()
    .from(cashPositionSnapshot)
    .where(and(eq(cashPositionSnapshot.orgId, orgId), eq(cashPositionSnapshot.id, id)));

  return row ?? null;
}

export async function listCashPositionSnapshotLines(
  db: DbClient,
  orgId: OrgId,
  snapshotId: string,
): Promise<CashPositionSnapshotLineRow[]> {
  const rows = await db
    .select()
    .from(cashPositionSnapshotLine)
    .where(
      and(
        eq(cashPositionSnapshotLine.orgId, orgId),
        eq(cashPositionSnapshotLine.snapshotId, snapshotId),
      ),
    )
    .orderBy(desc(cashPositionSnapshotLine.createdAt));

  return rows.map((r) => ({ ...r }));
}
