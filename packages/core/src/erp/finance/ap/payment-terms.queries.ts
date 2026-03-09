/**
 * Payment Terms read queries — list, getById, getByCode.
 *
 * RULES:
 *   1. All queries are org-scoped (filter by orgId).
 *   2. Read-only — no mutations.
 */

import type { DbClient } from "@afenda/db";
import { paymentTerms } from "@afenda/db";
import { eq, and, gt, asc } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX, PaymentTermsStatusValues } from "@afenda/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentTermsRow {
  id: string;
  orgId: string;
  code: string;
  description: string;
  netDays: number;
  discountPercent: string | null;
  discountDays: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTermsListParams {
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

export async function listPaymentTerms(
  db: DbClient,
  orgId: OrgId,
  params: PaymentTermsListParams = {},
): Promise<{ data: PaymentTermsRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(paymentTerms.orgId, orgId)];
  if (params.status && PaymentTermsStatusValues.includes(params.status as (typeof PaymentTermsStatusValues)[number])) {
    conditions.push(eq(paymentTerms.status, params.status as (typeof PaymentTermsStatusValues)[number]));
  }
  if (params.cursor) {
    conditions.push(gt(paymentTerms.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(paymentTerms)
    .where(and(...conditions))
    .orderBy(asc(paymentTerms.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map(mapPaymentTermsRow),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getPaymentTermsById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<PaymentTermsRow | null> {
  const [row] = await db
    .select()
    .from(paymentTerms)
    .where(and(eq(paymentTerms.orgId, orgId), eq(paymentTerms.id, id)))
    .limit(1);

  return row ? mapPaymentTermsRow(row) : null;
}

export async function getPaymentTermsByCode(
  db: DbClient,
  orgId: OrgId,
  code: string,
): Promise<PaymentTermsRow | null> {
  const [row] = await db
    .select()
    .from(paymentTerms)
    .where(and(eq(paymentTerms.orgId, orgId), eq(paymentTerms.code, code)))
    .limit(1);

  return row ? mapPaymentTermsRow(row) : null;
}

// ── Row mapping ───────────────────────────────────────────────────────────────

function mapPaymentTermsRow(row: typeof paymentTerms.$inferSelect): PaymentTermsRow {
  return {
    id: row.id,
    orgId: row.orgId,
    code: row.code,
    description: row.description,
    netDays: row.netDays,
    discountPercent: row.discountPercent,
    discountDays: row.discountDays,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
