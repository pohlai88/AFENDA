/**
 * AP Aging Service — Orchestrates aging report generation with database queries.
 */
import type { DbClient } from "@afenda/db";
import { invoice } from "@afenda/db";
import { eq, and, sql } from "drizzle-orm";
import { calculateAging, type AgingReport, type InvoiceForAging } from "./calculators/aging.js";

export interface GetAgingParams {
  readonly orgId: string;
  readonly asOfDate?: Date; // Defaults to today
  readonly supplierId?: string; // Optional filter by supplier
}

export interface AgingServiceResult {
  readonly ok: true;
  readonly data: AgingReport;
}

export interface AgingServiceError {
  readonly ok: false;
  readonly error: "AP_AGING_QUERY_FAILED";
}

/**
 * Generate AP aging report.
 * Queries unpaid invoices and calculates aging buckets.
 */
export async function getAgingReport(
  db: DbClient,
  params: GetAgingParams
): Promise<AgingServiceResult | AgingServiceError> {
  try {
    // gate:allow-js-date - Default parameter for SQL date comparison; caller can override
    const { orgId, asOfDate = new Date(), supplierId } = params;

    // Query unpaid invoices (status APPROVED or POSTED)
    // These are invoices that have been approved but not yet paid
    const conditions = [
      eq(invoice.orgId, orgId),
      sql`${invoice.status} IN ('approved', 'posted')`, // Unpaid invoices
    ];

    if (supplierId) {
      conditions.push(eq(invoice.supplierId, supplierId));
    }

    const invoices = await db
      .select({
        id: invoice.id,
        supplierId: invoice.supplierId,
        supplierName: sql<string>`'Unknown Supplier'`, // TODO: Join with supplier table when available
        dueDate: invoice.dueDate,
        amountMinor: invoice.amountMinor,
      })
      .from(invoice)
      .where(and(...conditions));

    // Transform to calculator input
    const invoicesForAging: InvoiceForAging[] = invoices.map((inv: any) => ({
      id: inv.id,
      supplierId: inv.supplierId,
      supplierName: inv.supplierName,
      dueDate: new Date(inv.dueDate), // gate:allow-js-date - Converting ISO string from DB to Date object for aging calculation
      balanceMinor: BigInt(inv.amountMinor), // Full amount is outstanding for unpaid invoices
    }));

    // Calculate aging using pure calculator
    const agingReport = calculateAging({
      invoices: invoicesForAging,
      asOfDate,
    });

    return {
      ok: true,
      data: agingReport,
    };
  } catch (err) {
    console.error("AP aging report generation failed:", err);
    return {
      ok: false,
      error: "AP_AGING_QUERY_FAILED",
    };
  }
}
