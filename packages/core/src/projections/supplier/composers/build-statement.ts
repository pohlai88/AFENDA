/**
 * Supplier portal composers — Class B projections.
 *
 * Multi-domain aggregation that combines invoice, hold, and supplier data
 * into portal-ready composite views.
 *
 * RULES:
 *   - Query tables directly with supplier-scoped WHERE clauses
 *   - Use shared mappers for row → view model conversion
 *   - All results wrapped in ProjectionEnvelope
 */

import type { DbClient } from "@afenda/db";
import { invoice, supplier, apHold } from "@afenda/db";
import { eq, and, count, desc, sql } from "drizzle-orm";
import type { CorrelationId, SupplierId } from "@afenda/contracts";
import type { OrgScopedContext } from "../../../kernel/governance/audit/audit.js";
import { createProjectionEnvelope } from "../../shared/projection-envelope.js";
import type { ProjectionResult } from "../../shared/projection-types.js";
import type { ProjectionEnvelope } from "../../shared/projection-envelope.js";
import type {
  SupplierStatementData,
  SupplierDashboardData,
} from "../types/view-models.js";
import { toInvoiceView } from "../types/mappers.js";

// ── Parameters ───────────────────────────────────────────────────────────────

export interface BuildStatementParams {
  supplierId: SupplierId;
}

export interface BuildDashboardParams {
  supplierId: SupplierId;
  recentInvoiceLimit?: number;
}

// ── Shared Data Fetch ────────────────────────────────────────────────────────

/**
 * Shared context used by both statement and dashboard composers.
 * Fetches supplier identity + all invoices + active hold count in one pass.
 */
interface SupplierDataBundle {
  sup: { id: string; name: string };
  invoiceRows: (typeof invoice.$inferSelect)[];
  activeHoldCount: number;
}

async function fetchSupplierDataBundle(
  db: DbClient,
  orgId: string,
  supplierId: string,
): Promise<ProjectionResult<SupplierDataBundle>> {
  // Fetch supplier identity
  const [sup] = await db
    .select({ id: supplier.id, name: supplier.name })
    .from(supplier)
    .where(and(eq(supplier.orgId, orgId), eq(supplier.id, supplierId)));

  if (!sup) {
    return {
      ok: false,
      error: {
        code: "PROJECTION_SUPPLIER_NOT_FOUND",
        message: `Supplier ${supplierId} not found`,
      },
    };
  }

  // Fetch all invoices for this supplier directly
  const invoiceRows = await db
    .select()
    .from(invoice)
    .where(and(eq(invoice.orgId, orgId), eq(invoice.supplierId, supplierId)))
    .orderBy(desc(invoice.createdAt));

  // Count active holds across all supplier invoices
  const invoiceIds = invoiceRows.map((inv) => inv.id);
  let activeHoldCount = 0;
  if (invoiceIds.length > 0) {
    const holdCounts = await db
      .select({ cnt: count() })
      .from(apHold)
      .where(
        and(
          eq(apHold.orgId, orgId),
          eq(apHold.status, "active"),
          sql`${apHold.invoiceId} = ANY(${invoiceIds})`,
        ),
      );
    activeHoldCount = holdCounts[0]?.cnt ?? 0;
  }

  return { ok: true, data: { sup, invoiceRows, activeHoldCount } };
}

// ── Composers ────────────────────────────────────────────────────────────────

/**
 * Build a supplier statement — aggregates all invoices and financial summary.
 * Class B projection — multi-domain (AP + supplier identity).
 */
export async function buildSupplierStatement(
  db: DbClient,
  ctx: OrgScopedContext,
  correlationId: CorrelationId,
  params: BuildStatementParams,
): Promise<ProjectionResult<ProjectionEnvelope<SupplierStatementData>>> {
  const orgId = ctx.activeContext.orgId;

  const bundle = await fetchSupplierDataBundle(db, orgId, params.supplierId as string);
  if (!bundle.ok) return bundle;

  const { sup, invoiceRows, activeHoldCount } = bundle.data;

  // Aggregate financials
  const outstandingStatuses = ["submitted", "approved", "posted"];
  let totalOutstandingMinor = 0n;
  let totalPaidMinor = 0n;
  let currencyCode = "USD";

  for (const inv of invoiceRows) {
    if (inv.currencyCode) currencyCode = inv.currencyCode;
    if (outstandingStatuses.includes(inv.status)) {
      totalOutstandingMinor += inv.amountMinor;
    }
    if (inv.status === "paid") {
      totalPaidMinor += inv.amountMinor;
    }
  }

  const statement: SupplierStatementData = {
    supplierId: sup.id,
    supplierName: sup.name,
    totalInvoices: invoiceRows.length,
    totalOutstandingMinor,
    totalPaidMinor,
    currencyCode,
    invoices: invoiceRows.map(toInvoiceView),
    activeHoldCount,
  };

  return {
    ok: true,
    data: createProjectionEnvelope({
      data: statement,
      projectionType: "supplier-statement",
      dominantDomain: "ap",
      supportingDomains: ["supplier"],
      correlationId: correlationId as string,
      sourceRefs: {
        ap: `invoices:supplier:${sup.id}`,
        supplier: `identity:${sup.id}`,
      },
    }),
  };
}

/**
 * Build a supplier dashboard — high-level summary with status counts.
 * Class B projection — multi-domain (AP + supplier identity).
 */
export async function buildSupplierDashboard(
  db: DbClient,
  ctx: OrgScopedContext,
  correlationId: CorrelationId,
  params: BuildDashboardParams,
): Promise<ProjectionResult<ProjectionEnvelope<SupplierDashboardData>>> {
  const orgId = ctx.activeContext.orgId;
  const recentLimit = params.recentInvoiceLimit ?? 5;

  const bundle = await fetchSupplierDataBundle(db, orgId, params.supplierId as string);
  if (!bundle.ok) return bundle;

  const { sup, invoiceRows, activeHoldCount } = bundle.data;

  // Status counts
  let draftCount = 0;
  let submittedCount = 0;
  let approvedCount = 0;
  let paidCount = 0;
  let rejectedCount = 0;
  let postedCount = 0;
  let voidedCount = 0;
  let totalOutstandingMinor = 0n;
  let currencyCode = "USD";

  const outstandingStatuses = ["submitted", "approved", "posted"];

  for (const inv of invoiceRows) {
    if (inv.currencyCode) currencyCode = inv.currencyCode;
    switch (inv.status) {
      case "draft":
        draftCount++;
        break;
      case "submitted":
        submittedCount++;
        break;
      case "approved":
        approvedCount++;
        break;
      case "paid":
        paidCount++;
        break;
      case "rejected":
        rejectedCount++;
        break;
      case "posted":
        postedCount++;
        break;
      case "voided":
        voidedCount++;
        break;
    }
    if (outstandingStatuses.includes(inv.status)) {
      totalOutstandingMinor += inv.amountMinor;
    }
  }

  // Invoices already ordered by createdAt desc from fetchSupplierDataBundle
  const recentInvoices = invoiceRows.slice(0, recentLimit).map(toInvoiceView);

  const dashboard: SupplierDashboardData = {
    supplierId: sup.id,
    supplierName: sup.name,
    currencyCode,
    draftCount,
    submittedCount,
    approvedCount,
    paidCount,
    rejectedCount,
    postedCount,
    voidedCount,
    totalOutstandingMinor,
    activeHoldCount,
    recentInvoices,
  };

  return {
    ok: true,
    data: createProjectionEnvelope({
      data: dashboard,
      projectionType: "supplier-dashboard",
      dominantDomain: "ap",
      supportingDomains: ["supplier"],
      correlationId: correlationId as string,
      sourceRefs: {
        ap: `invoices:supplier:${sup.id}`,
        supplier: `identity:${sup.id}`,
      },
    }),
  };
}
