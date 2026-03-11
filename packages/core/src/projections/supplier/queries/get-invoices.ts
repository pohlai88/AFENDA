/**
 * Supplier portal queries — Class A projections.
 *
 * Read-only queries that fetch AP domain data scoped to a specific supplier
 * and shape it for the portal UI. Each query returns a ProjectionEnvelope.
 *
 * RULES:
 *   - Query tables directly with supplier-scoped WHERE clauses
 *   - All results wrapped in ProjectionEnvelope
 *   - Org isolation via OrgScopedContext (structural, not parameter)
 */

import type { DbClient } from "@afenda/db";
import { invoice, apHold } from "@afenda/db";
import { eq, and, asc, desc } from "drizzle-orm";
import type { CorrelationId, SupplierId, InvoiceId, InvoiceStatus } from "@afenda/contracts";
import type { OrgScopedContext } from "../../../kernel/governance/audit/audit";
import { createProjectionEnvelope } from "../../shared/projection-envelope";
import type { ProjectionResult } from "../../shared/projection-types";
import type { ProjectionEnvelope } from "../../shared/projection-envelope";
import type { SupplierInvoiceView, SupplierHoldView } from "../types/view-models";
import { toInvoiceView, toHoldView } from "../types/mappers";

// ── Query Parameters ─────────────────────────────────────────────────────────

export interface GetSupplierInvoicesParams {
  supplierId: SupplierId;
  status?: InvoiceStatus;
  limit?: number;
}

export interface GetInvoiceDetailParams {
  invoiceId: InvoiceId;
}

export interface GetInvoiceHoldsParams {
  invoiceId: InvoiceId;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * List invoices for a supplier, optionally filtered by status.
 * Class A projection — read-only, single-domain (AP).
 *
 * Queries the invoice table directly with a WHERE supplierId clause
 * for efficient supplier-scoped retrieval.
 */
export async function getSupplierInvoices(
  db: DbClient,
  ctx: OrgScopedContext,
  correlationId: CorrelationId,
  params: GetSupplierInvoicesParams,
): Promise<ProjectionResult<ProjectionEnvelope<SupplierInvoiceView[]>>> {
  const orgId = ctx.activeContext.orgId;
  const limit = Math.min(params.limit ?? 100, 1000);

  const conditions = [
    eq(invoice.orgId, orgId),
    eq(invoice.supplierId, params.supplierId as string),
  ];

  if (params.status) {
    conditions.push(eq(invoice.status, params.status));
  }

  const rows = await db
    .select()
    .from(invoice)
    .where(and(...conditions))
    .orderBy(desc(invoice.createdAt))
    .limit(limit);

  return {
    ok: true,
    data: createProjectionEnvelope({
      data: rows.map(toInvoiceView),
      projectionType: "supplier-invoices",
      dominantDomain: "ap",
      correlationId: correlationId as string,
      sourceRefs: { ap: `invoices:supplier:${params.supplierId as string}` },
    }),
  };
}

/**
 * Get a single invoice detail for the supplier portal.
 * Class A projection — read-only, single-domain (AP).
 */
export async function getSupplierInvoiceDetail(
  db: DbClient,
  ctx: OrgScopedContext,
  correlationId: CorrelationId,
  params: GetInvoiceDetailParams,
): Promise<ProjectionResult<ProjectionEnvelope<SupplierInvoiceView>>> {
  const orgId = ctx.activeContext.orgId;

  const [row] = await db
    .select()
    .from(invoice)
    .where(and(eq(invoice.orgId, orgId), eq(invoice.id, params.invoiceId as string)))
    .limit(1);

  if (!row) {
    return {
      ok: false,
      error: {
        code: "PROJECTION_INVOICE_NOT_FOUND",
        message: `Invoice ${params.invoiceId as string} not found`,
      },
    };
  }

  return {
    ok: true,
    data: createProjectionEnvelope({
      data: toInvoiceView(row),
      projectionType: "supplier-invoice-detail",
      dominantDomain: "ap",
      correlationId: correlationId as string,
      sourceRefs: { ap: `invoice:${row.id}` },
    }),
  };
}

/**
 * Get holds for a specific invoice.
 * Class A projection — read-only, single-domain (AP).
 */
export async function getSupplierInvoiceHolds(
  db: DbClient,
  ctx: OrgScopedContext,
  correlationId: CorrelationId,
  params: GetInvoiceHoldsParams,
): Promise<ProjectionResult<ProjectionEnvelope<SupplierHoldView[]>>> {
  const orgId = ctx.activeContext.orgId;

  const rows = await db
    .select()
    .from(apHold)
    .where(and(eq(apHold.orgId, orgId), eq(apHold.invoiceId, params.invoiceId as string)))
    .orderBy(asc(apHold.createdAt));

  return {
    ok: true,
    data: createProjectionEnvelope({
      data: rows.map(toHoldView),
      projectionType: "supplier-invoice-holds",
      dominantDomain: "ap",
      correlationId: correlationId as string,
      sourceRefs: { ap: `holds:invoice:${params.invoiceId as string}` },
    }),
  };
}
