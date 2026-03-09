/**
 * PaymentRun read queries — list, getById.
 *
 * RULES:
 *   1. All queries are org-scoped (filter by orgId).
 *   2. Read-only — no mutations.
 */

import type { DbClient } from "@afenda/db";
import { paymentRun } from "@afenda/db";
import { eq, and, gt, asc } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX, PaymentRunStatusValues } from "@afenda/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentRunRow {
  id: string;
  orgId: string;
  runNumber: string;
  description: string | null;
  paymentMethod: string;
  currencyCode: string;
  paymentDate: string;
  totalAmountMinor: bigint;
  totalDiscountMinor: bigint;
  itemCount: number;
  status: string;
  approvedByPrincipalId: string | null;
  approvedAt: Date | null;
  executedByPrincipalId: string | null;
  executedAt: Date | null;
  bankReference: string | null;
  reversedByPrincipalId: string | null;
  reversedAt: Date | null;
  reversalReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRunListParams {
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

export async function listPaymentRuns(
  db: DbClient,
  orgId: OrgId,
  params: PaymentRunListParams = {},
): Promise<{ data: PaymentRunRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(paymentRun.orgId, orgId)];
  if (params.status && PaymentRunStatusValues.includes(params.status as (typeof PaymentRunStatusValues)[number])) {
    conditions.push(eq(paymentRun.status, params.status as (typeof PaymentRunStatusValues)[number]));
  }
  if (params.cursor) {
    conditions.push(gt(paymentRun.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(paymentRun)
    .where(and(...conditions))
    .orderBy(asc(paymentRun.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map(mapPaymentRunRow),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getPaymentRunById(
  db: DbClient,
  orgId: OrgId,
  paymentRunId: string,
): Promise<PaymentRunRow | null> {
  const [row] = await db
    .select()
    .from(paymentRun)
    .where(and(eq(paymentRun.orgId, orgId), eq(paymentRun.id, paymentRunId)))
    .limit(1);

  return row ? mapPaymentRunRow(row) : null;
}

// ── Row mapping ───────────────────────────────────────────────────────────────

function mapPaymentRunRow(row: typeof paymentRun.$inferSelect): PaymentRunRow {
  return {
    id: row.id,
    orgId: row.orgId,
    runNumber: row.runNumber,
    description: row.description,
    paymentMethod: row.paymentMethod,
    currencyCode: row.currencyCode,
    paymentDate: row.paymentDate,
    totalAmountMinor: row.totalAmountMinor,
    totalDiscountMinor: row.totalDiscountMinor,
    itemCount: row.itemCount,
    status: row.status,
    approvedByPrincipalId: row.approvedByPrincipalId,
    approvedAt: row.approvedAt,
    executedByPrincipalId: row.executedByPrincipalId,
    executedAt: row.executedAt,
    bankReference: row.bankReference,
    reversedByPrincipalId: row.reversedByPrincipalId,
    reversedAt: row.reversedAt,
    reversalReason: row.reversalReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
