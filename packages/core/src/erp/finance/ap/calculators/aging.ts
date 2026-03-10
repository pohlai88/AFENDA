/**
 * Aging Calculator — Pure function for AP aging bucket computation.
 *
 * Industry-standard aging buckets:
 * - Current (0 days overdue)
 * - 1-30 days
 * - 31-60 days
 * - 61-90 days
 * - 90+ days
 *
 * Algorithm:
 * 1. For each invoice, calculate days overdue = asOfDate - dueDate
 * 2. Group by supplier and aging bucket
 * 3. Sum amounts per bucket
 * 4. Return structured aging report
 */

export interface AgingBucket {
  readonly bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
  readonly minDays: number;
  readonly maxDays: number | null; // null for "90+" bucket
  readonly totalAmountMinor: bigint;
  readonly invoiceCount: number;
  readonly invoices: readonly string[]; // Invoice IDs for drill-down
}

export interface SupplierAging {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly totalOutstandingMinor: bigint;
  readonly invoiceCount: number;
  readonly buckets: readonly AgingBucket[];
}

export interface InvoiceForAging {
  readonly id: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly dueDate: Date;
  readonly balanceMinor: bigint; // Outstanding balance (not total amount)
}

export interface AgingReportInput {
  readonly invoices: readonly InvoiceForAging[];
  readonly asOfDate: Date;
}

export interface AgingReport {
  readonly asOfDate: Date;
  readonly suppliers: readonly SupplierAging[];
  readonly summary: {
    readonly totalOutstandingMinor: bigint;
    readonly totalInvoiceCount: number;
    readonly byBucket: readonly AgingBucket[];
  };
}

/**
 * Calculate days between two dates (asOfDate - dueDate).
 * Positive = overdue, Negative = not yet due.
 */
function calculateDaysOverdue(dueDate: Date, asOfDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const dueDateMs = dueDate.getTime();
  const asOfDateMs = asOfDate.getTime();
  return Math.floor((asOfDateMs - dueDateMs) / msPerDay);
}

/**
 * Classify invoice into aging bucket based on days overdue.
 */
function classifyBucket(daysOverdue: number): AgingBucket["bucket"] {
  if (daysOverdue < 0) return "current"; // Not yet due
  if (daysOverdue === 0) return "current";
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}

/**
 * Get bucket definition (min/max days).
 */
function getBucketDefinition(
  bucket: AgingBucket["bucket"]
): Pick<AgingBucket, "minDays" | "maxDays"> {
  switch (bucket) {
    case "current":
      return { minDays: -Infinity, maxDays: 0 };
    case "1-30":
      return { minDays: 1, maxDays: 30 };
    case "31-60":
      return { minDays: 31, maxDays: 60 };
    case "61-90":
      return { minDays: 61, maxDays: 90 };
    case "90+":
      return { minDays: 91, maxDays: null };
  }
}

/**
 * Pure aging calculator — no I/O, no side effects.
 * Returns structured aging report grouped by supplier and bucket.
 */
export function calculateAging(input: AgingReportInput): AgingReport {
  const { invoices, asOfDate } = input;

  // Group invoices by supplier
  const bySupplier = new Map<
    string,
    {
      supplierName: string;
      invoices: InvoiceForAging[];
    }
  >();

  for (const inv of invoices) {
    const existing = bySupplier.get(inv.supplierId);
    if (existing) {
      existing.invoices.push(inv);
    } else {
      bySupplier.set(inv.supplierId, {
        supplierName: inv.supplierName,
        invoices: [inv],
      });
    }
  }

  // Calculate aging for each supplier
  const suppliers: SupplierAging[] = [];

  for (const [supplierId, { supplierName, invoices: supplierInvoices }] of bySupplier) {
    // Group supplier invoices by bucket
    const bucketMap = new Map<
      AgingBucket["bucket"],
      {
        totalAmountMinor: bigint;
        invoiceIds: string[];
      }
    >();

    let totalOutstandingMinor = 0n;

    for (const inv of supplierInvoices) {
      const daysOverdue = calculateDaysOverdue(inv.dueDate, asOfDate);
      const bucket = classifyBucket(daysOverdue);

      const existing = bucketMap.get(bucket);
      if (existing) {
        existing.totalAmountMinor += inv.balanceMinor;
        existing.invoiceIds.push(inv.id);
      } else {
        bucketMap.set(bucket, {
          totalAmountMinor: inv.balanceMinor,
          invoiceIds: [inv.id],
        });
      }

      totalOutstandingMinor += inv.balanceMinor;
    }

    // Build buckets array (include all buckets, even with zero amount for consistency)
    const allBuckets: AgingBucket["bucket"][] = ["current", "1-30", "31-60", "61-90", "90+"];
    const buckets: AgingBucket[] = allBuckets.map((bucketName) => {
      const data = bucketMap.get(bucketName);
      const { minDays, maxDays } = getBucketDefinition(bucketName);

      return {
        bucket: bucketName,
        minDays,
        maxDays,
        totalAmountMinor: data?.totalAmountMinor ?? 0n,
        invoiceCount: data?.invoiceIds.length ?? 0,
        invoices: data?.invoiceIds ?? [],
      };
    });

    suppliers.push({
      supplierId,
      supplierName,
      totalOutstandingMinor,
      invoiceCount: supplierInvoices.length,
      buckets,
    });
  }

  // Calculate summary across all suppliers
  const allBuckets: AgingBucket["bucket"][] = ["current", "1-30", "31-60", "61-90", "90+"];
  const summaryBucketMap = new Map<
    AgingBucket["bucket"],
    {
      totalAmountMinor: bigint;
      invoiceIds: string[];
    }
  >();

  let totalOutstandingMinor = 0n;

  for (const inv of invoices) {
    const daysOverdue = calculateDaysOverdue(inv.dueDate, asOfDate);
    const bucket = classifyBucket(daysOverdue);

    const existing = summaryBucketMap.get(bucket);
    if (existing) {
      existing.totalAmountMinor += inv.balanceMinor;
      existing.invoiceIds.push(inv.id);
    } else {
      summaryBucketMap.set(bucket, {
        totalAmountMinor: inv.balanceMinor,
        invoiceIds: [inv.id],
      });
    }

    totalOutstandingMinor += inv.balanceMinor;
  }

  const summaryBuckets: AgingBucket[] = allBuckets.map((bucketName) => {
    const data = summaryBucketMap.get(bucketName);
    const { minDays, maxDays } = getBucketDefinition(bucketName);

    return {
      bucket: bucketName,
      minDays,
      maxDays,
      totalAmountMinor: data?.totalAmountMinor ?? 0n,
      invoiceCount: data?.invoiceIds.length ?? 0,
      invoices: data?.invoiceIds ?? [],
    };
  });

  return {
    asOfDate,
    suppliers: suppliers.sort((a, b) => {
      // Sort by total outstanding descending (highest first)
      if (a.totalOutstandingMinor > b.totalOutstandingMinor) return -1;
      if (a.totalOutstandingMinor < b.totalOutstandingMinor) return 1;
      return 0;
    }),
    summary: {
      totalOutstandingMinor,
      totalInvoiceCount: invoices.length,
      byBucket: summaryBuckets,
    },
  };
}
