/**
 * detectDuplicates — pure calculator for invoice duplicate detection.
 *
 * Fingerprint: supplierId|supplierRef|totalAmount|invoiceDate
 * Returns groups with 2+ invoices sharing the same fingerprint.
 */

export interface InvoiceFingerprint {
  readonly invoiceId: string;
  readonly supplierId: string;
  readonly supplierRef: string;
  readonly totalAmount: bigint;
  readonly invoiceDate: Date;
}

export interface DuplicateGroup {
  readonly fingerprint: string;
  readonly invoices: readonly InvoiceFingerprint[];
}

function buildFingerprint(inv: InvoiceFingerprint): string {
  const dateStr = inv.invoiceDate.toISOString().slice(0, 10);
  return `${inv.supplierId}|${inv.supplierRef}|${inv.totalAmount}|${dateStr}`;
}

/**
 * Pure duplicate detection. No I/O.
 * Returns only groups with 2+ invoices.
 */
export function detectDuplicates(
  invoices: readonly InvoiceFingerprint[],
): readonly DuplicateGroup[] {
  const byFingerprint = new Map<string, InvoiceFingerprint[]>();

  for (const inv of invoices) {
    const fp = buildFingerprint(inv);
    const list = byFingerprint.get(fp) ?? [];
    list.push(inv);
    byFingerprint.set(fp, list);
  }

  const groups: DuplicateGroup[] = [];
  for (const [fingerprint, list] of byFingerprint) {
    if (list.length >= 2) {
      groups.push({ fingerprint, invoices: list });
    }
  }

  return groups;
}
