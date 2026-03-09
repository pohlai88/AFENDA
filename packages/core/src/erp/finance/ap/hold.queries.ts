/**
 * Hold read queries — findByInvoice, getById, hasActiveHolds.
 *
 * RULES:
 *   1. All queries are org-scoped (filter by orgId).
 *   2. Read-only — no mutations.
 */

import type { DbClient } from "@afenda/db";
import { apHold } from "@afenda/db";
import { eq, and } from "drizzle-orm";
import type { OrgId, InvoiceId } from "@afenda/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HoldRow {
  id: string;
  orgId: string;
  invoiceId: string;
  holdType: string;
  holdReason: string;
  status: string;
  createdByPrincipalId: string | null;
  releasedAt: Date | null;
  releasedByPrincipalId: string | null;
  releaseReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Check if an invoice has any active holds.
 * Used by approveInvoice to block approval when holds exist.
 */
export async function hasActiveHolds(
  db: DbClient,
  orgId: OrgId,
  invoiceId: InvoiceId,
): Promise<boolean> {
  const [row] = await db
    .select({ id: apHold.id })
    .from(apHold)
    .where(
      and(
        eq(apHold.orgId, orgId),
        eq(apHold.invoiceId, invoiceId),
        eq(apHold.status, "active"),
      ),
    )
    .limit(1);

  return !!row;
}

/**
 * List all holds for an invoice (active and released).
 */
export async function findHoldsByInvoice(
  db: DbClient,
  orgId: OrgId,
  invoiceId: InvoiceId,
): Promise<HoldRow[]> {
  const rows = await db
    .select()
    .from(apHold)
    .where(and(eq(apHold.orgId, orgId), eq(apHold.invoiceId, invoiceId)))
    .orderBy(apHold.createdAt);

  return rows.map(mapHoldRow);
}

/**
 * Get a single hold by ID.
 */
export async function getHoldById(
  db: DbClient,
  orgId: OrgId,
  holdId: string,
): Promise<HoldRow | null> {
  const [row] = await db
    .select()
    .from(apHold)
    .where(and(eq(apHold.orgId, orgId), eq(apHold.id, holdId)))
    .limit(1);

  return row ? mapHoldRow(row) : null;
}

// ── Row mapping ───────────────────────────────────────────────────────────────

function mapHoldRow(row: typeof apHold.$inferSelect): HoldRow {
  return {
    id: row.id,
    orgId: row.orgId,
    invoiceId: row.invoiceId,
    holdType: row.holdType,
    holdReason: row.holdReason,
    status: row.status,
    createdByPrincipalId: row.createdByPrincipalId,
    releasedAt: row.releasedAt,
    releasedByPrincipalId: row.releasedByPrincipalId,
    releaseReason: row.releaseReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
