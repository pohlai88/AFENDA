/**
 * AP Aging Queries — Read-only queries for aging report data.
 */
import type { DbClient } from "@afenda/db";
import { invoice } from "@afenda/db";
import { eq, and, sql, desc } from "drizzle-orm";

export interface InvoiceAgingRow {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly supplierId: string;
  readonly invoiceDate: string; // ISO date string (from createdAt)
  readonly dueDate: string;
  readonly amountMinor: string; // BigInt as string for JSON serialization
  readonly balanceMinor: string; // Outstanding balance (full amount for unpaid invoices)
  readonly daysOverdue: number;
  readonly status: string;
}

export interface GetInvoicesByAgingBucketParams {
  readonly orgId: string;
  readonly bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
  readonly asOfDate?: Date;
}

/**
 * Get invoices in a specific aging bucket for drill-down.
 */
export async function getInvoicesByAgingBucket(
  db: DbClient,
  params: GetInvoicesByAgingBucketParams
): Promise<InvoiceAgingRow[]> {
  // gate:allow-js-date - Default parameter for SQL date comparison; caller can override
  const { orgId, bucket, asOfDate = new Date() } = params;

  // Calculate days overdue using SQL
  const daysOverdueExpr = sql<number>`
    EXTRACT(DAY FROM (${asOfDate}::date - ${invoice.dueDate}::date))
  `;

  // Build bucket filter
  let bucketCondition;
  switch (bucket) {
    case "current":
      bucketCondition = sql`${daysOverdueExpr} <= 0`;
      break;
    case "1-30":
      bucketCondition = sql`${daysOverdueExpr} BETWEEN 1 AND 30`;
      break;
    case "31-60":
      bucketCondition = sql`${daysOverdueExpr} BETWEEN 31 AND 60`;
      break;
    case "61-90":
      bucketCondition = sql`${daysOverdueExpr} BETWEEN 61 AND 90`;
      break;
    case "90+":
      bucketCondition = sql`${daysOverdueExpr} > 90`;
      break;
  }

  const rows = await db
    .select({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      supplierId: invoice.supplierId,
      createdAt: invoice.createdAt,
      dueDate: invoice.dueDate,
      amountMinor: invoice.amountMinor,
      status: invoice.status,
      daysOverdue: daysOverdueExpr,
    })
    .from(invoice)
    .where(
      and(
        eq(invoice.orgId, orgId),
        sql`${invoice.status} IN ('approved', 'posted')`,
        bucketCondition
      )
    )
    .orderBy(desc(daysOverdueExpr));

  return rows.map((row: any) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    supplierId: row.supplierId,
    invoiceDate: row.createdAt.toISOString().slice(0, 10),
    dueDate: row.dueDate.toISOString().slice(0, 10),
    amountMinor: row.amountMinor.toString(),
    balanceMinor: row.amountMinor.toString(), // Full amount for unpaid invoices
    daysOverdue: Number(row.daysOverdue),
    status: row.status,
  }));
}
