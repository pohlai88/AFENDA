/**
 * Invoice read queries — list and get-by-id.
 *
 * RULES:
 *   - All queries are org-scoped — `orgId` in every WHERE clause.
 *   - Cursor pagination via opaque cursor (base64-encoded `id`).
 *   - Returns plain objects — no class instances, no lazy loading.
 *   - No HTTP/Fastify imports — pure domain query.
 */

import type { DbClient } from "@afenda/db";
import { invoice, invoiceStatusHistory } from "@afenda/db";
import { eq, and, gt, desc, asc } from "drizzle-orm";
import type { OrgId, InvoiceId, InvoiceStatus, CursorPage } from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";

// Re-export for backward compatibility
export type { CursorPage } from "@afenda/contracts";

// ── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceRow {
  id: string;
  orgId: string;
  supplierId: string;
  invoiceNumber: string;
  amountMinor: bigint;
  currencyCode: string;
  status: string;
  dueDate: string | null;
  submittedByPrincipalId: string | null;
  submittedAt: Date | null;
  poReference: string | null;
  paidAt: Date | null;
  paidByPrincipalId: string | null;
  paymentReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceListParams {
  cursor?: string;
  limit?: number;
  status?: InvoiceStatus;
}

export interface InvoiceHistoryRow {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorPrincipalId: string | null;
  correlationId: string;
  reason: string | null;
  occurredAt: Date;
}

// ── Cursor helpers ───────────────────────────────────────────────────────────

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

// ── List invoices ────────────────────────────────────────────────────────────

export async function listInvoices(
  db: DbClient,
  orgId: OrgId,
  params: InvoiceListParams = {},
): Promise<CursorPage<InvoiceRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1; // fetch one extra to determine hasMore

  const conditions = [eq(invoice.orgId, orgId)];

  if (params.status) {
    conditions.push(eq(invoice.status, params.status));
  }

  if (params.cursor) {
    const cursorId = decodeCursor(params.cursor);
    conditions.push(gt(invoice.id, cursorId));
  }

  const rows = await db
    .select()
    .from(invoice)
    .where(and(...conditions))
    .orderBy(asc(invoice.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map(mapInvoiceRow),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

// ── Get invoice by ID ────────────────────────────────────────────────────────

export async function getInvoiceById(
  db: DbClient,
  orgId: OrgId,
  invoiceId: InvoiceId,
): Promise<InvoiceRow | null> {
  const [row] = await db
    .select()
    .from(invoice)
    .where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, orgId)));

  return row ? mapInvoiceRow(row) : null;
}

// ── Get invoice status history ───────────────────────────────────────────────

export async function getInvoiceHistory(
  db: DbClient,
  orgId: OrgId,
  invoiceId: InvoiceId,
): Promise<InvoiceHistoryRow[]> {
  const rows = await db
    .select({
      id: invoiceStatusHistory.id,
      fromStatus: invoiceStatusHistory.fromStatus,
      toStatus: invoiceStatusHistory.toStatus,
      actorPrincipalId: invoiceStatusHistory.actorPrincipalId,
      correlationId: invoiceStatusHistory.correlationId,
      reason: invoiceStatusHistory.reason,
      occurredAt: invoiceStatusHistory.occurredAt,
    })
    .from(invoiceStatusHistory)
    .where(
      and(eq(invoiceStatusHistory.invoiceId, invoiceId), eq(invoiceStatusHistory.orgId, orgId)),
    )
    .orderBy(desc(invoiceStatusHistory.occurredAt));

  return rows;
}

// ── Row mapping ──────────────────────────────────────────────────────────────

function mapInvoiceRow(row: typeof invoice.$inferSelect): InvoiceRow {
  return {
    id: row.id,
    orgId: row.orgId,
    supplierId: row.supplierId,
    invoiceNumber: row.invoiceNumber,
    amountMinor: row.amountMinor,
    currencyCode: row.currencyCode,
    status: row.status,
    dueDate: row.dueDate,
    submittedByPrincipalId: row.submittedByPrincipalId,
    submittedAt: row.submittedAt,
    poReference: row.poReference,
    paidAt: row.paidAt,
    paidByPrincipalId: row.paidByPrincipalId,
    paymentReference: row.paymentReference,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
