/**
 * Payment Run Item read queries — list by run, get by ID.
 *
 * RULES:
 *   1. All queries are org-scoped (filter by orgId).
 *   2. Read-only — no mutations.
 */

import type { DbClient } from "@afenda/db";
import { paymentRunItem } from "@afenda/db";
import { eq, and, asc } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentRunItemRow {
  id: string;
  orgId: string;
  paymentRunId: string;
  invoiceId: string;
  supplierId: string;
  invoiceNumber: string;
  invoiceDueDate: string;
  invoiceAmountMinor: bigint;
  amountPaidMinor: bigint;
  discountTakenMinor: bigint;
  status: string;
  paymentReference: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listPaymentRunItems(
  db: DbClient,
  orgId: OrgId,
  paymentRunId: string,
): Promise<PaymentRunItemRow[]> {
  const rows = await db
    .select()
    .from(paymentRunItem)
    .where(and(eq(paymentRunItem.orgId, orgId), eq(paymentRunItem.paymentRunId, paymentRunId)))
    .orderBy(asc(paymentRunItem.createdAt));

  return rows.map(mapRow);
}

export async function getPaymentRunItemById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<PaymentRunItemRow | null> {
  const [row] = await db
    .select()
    .from(paymentRunItem)
    .where(and(eq(paymentRunItem.orgId, orgId), eq(paymentRunItem.id, id)))
    .limit(1);

  return row ? mapRow(row) : null;
}

// ── Row mapping ───────────────────────────────────────────────────────────────

function mapRow(row: typeof paymentRunItem.$inferSelect): PaymentRunItemRow {
  return {
    id: row.id,
    orgId: row.orgId,
    paymentRunId: row.paymentRunId,
    invoiceId: row.invoiceId,
    supplierId: row.supplierId,
    invoiceNumber: row.invoiceNumber,
    invoiceDueDate: row.invoiceDueDate,
    invoiceAmountMinor: row.invoiceAmountMinor,
    amountPaidMinor: row.amountPaidMinor,
    discountTakenMinor: row.discountTakenMinor,
    status: row.status,
    paymentReference: row.paymentReference,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
