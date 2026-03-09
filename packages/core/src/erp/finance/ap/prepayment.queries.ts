/**
 * Prepayment read queries — list, getById.
 *
 * RULES:
 *   1. All queries are org-scoped (filter by orgId).
 *   2. Read-only — no mutations.
 */

import type { DbClient } from "@afenda/db";
import { prepayment } from "@afenda/db";
import { eq, and, gt, asc } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";
import { PrepaymentStatusValues } from "@afenda/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PrepaymentRow {
  id: string;
  orgId: string;
  supplierId: string;
  prepaymentNumber: string;
  description: string | null;
  currencyCode: string;
  originalAmountMinor: bigint;
  balanceMinor: bigint;
  paymentDate: string;
  paymentReference: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrepaymentListParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

// ── Cursor helpers ───────────────────────────────────────────────────────────

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listPrepayments(
  db: DbClient,
  orgId: OrgId,
  params: PrepaymentListParams = {},
): Promise<{ data: PrepaymentRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(prepayment.orgId, orgId)];
  if (params.status && PrepaymentStatusValues.includes(params.status as (typeof PrepaymentStatusValues)[number])) {
    conditions.push(eq(prepayment.status, params.status as (typeof PrepaymentStatusValues)[number]));
  }
  if (params.cursor) {
    conditions.push(gt(prepayment.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(prepayment)
    .where(and(...conditions))
    .orderBy(asc(prepayment.id))
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

export async function getPrepaymentById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<PrepaymentRow | null> {
  const [row] = await db
    .select()
    .from(prepayment)
    .where(and(eq(prepayment.orgId, orgId), eq(prepayment.id, id)))
    .limit(1);

  return row ? mapRow(row) : null;
}

// ── Row mapping ───────────────────────────────────────────────────────────────

function mapRow(row: typeof prepayment.$inferSelect): PrepaymentRow {
  return {
    id: row.id,
    orgId: row.orgId,
    supplierId: row.supplierId,
    prepaymentNumber: row.prepaymentNumber,
    description: row.description,
    currencyCode: row.currencyCode,
    originalAmountMinor: row.originalAmountMinor,
    balanceMinor: row.balanceMinor,
    paymentDate: row.paymentDate,
    paymentReference: row.paymentReference,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
