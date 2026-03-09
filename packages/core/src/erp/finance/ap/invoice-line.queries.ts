/**
 * Invoice Line read queries — list by invoice, get by ID.
 *
 * RULES:
 *   1. All queries are org-scoped (filter by orgId).
 *   2. Read-only — no mutations.
 */

import type { DbClient } from "@afenda/db";
import { invoiceLine } from "@afenda/db";
import { eq, and, asc } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InvoiceLineRow {
  id: string;
  orgId: string;
  invoiceId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPriceMinor: bigint;
  amountMinor: bigint;
  glAccountId: string | null;
  taxCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listInvoiceLines(
  db: DbClient,
  orgId: OrgId,
  invoiceId: string,
): Promise<InvoiceLineRow[]> {
  const rows = await db
    .select()
    .from(invoiceLine)
    .where(and(eq(invoiceLine.orgId, orgId), eq(invoiceLine.invoiceId, invoiceId)))
    .orderBy(asc(invoiceLine.lineNumber));

  return rows.map(mapRow);
}

export async function getInvoiceLineById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<InvoiceLineRow | null> {
  const [row] = await db
    .select()
    .from(invoiceLine)
    .where(and(eq(invoiceLine.orgId, orgId), eq(invoiceLine.id, id)))
    .limit(1);

  return row ? mapRow(row) : null;
}

// ── Row mapping ───────────────────────────────────────────────────────────────

function mapRow(row: typeof invoiceLine.$inferSelect): InvoiceLineRow {
  return {
    id: row.id,
    orgId: row.orgId,
    invoiceId: row.invoiceId,
    lineNumber: row.lineNumber,
    description: row.description,
    quantity: row.quantity,
    unitPriceMinor: row.unitPriceMinor,
    amountMinor: row.amountMinor,
    glAccountId: row.glAccountId,
    taxCode: row.taxCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
