/**
 * Supplier portal view models — typed shapes for portal UI consumption.
 *
 * These types mirror the DB row shapes but are explicitly defined to
 * decouple the portal from internal schema drift.
 *
 * RULES:
 *   - Money is always bigint (minor units / cents)
 *   - Dates from DB are Date objects; dueDate is string | null (YYYY-MM-DD)
 *   - IDs are plain strings (branded types are internal to domain services)
 */

// ── Invoice View ─────────────────────────────────────────────────────────────

/** A single invoice as seen from the supplier portal. */
export interface SupplierInvoiceView {
  id: string;
  invoiceNumber: string;
  amountMinor: bigint;
  currencyCode: string;
  status: string;
  dueDate: string | null;
  poReference: string | null;
  submittedAt: Date | null;
  paidAt: Date | null;
  paymentReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Hold View ────────────────────────────────────────────────────────────────

/** A hold on an invoice as seen from the supplier portal. */
export interface SupplierHoldView {
  id: string;
  invoiceId: string;
  holdType: string;
  holdReason: string;
  status: string;
  createdAt: Date;
  releasedAt: Date | null;
  releaseReason: string | null;
}

// ── Statement Summary ────────────────────────────────────────────────────────

/** Aggregated statement for a single supplier. */
export interface SupplierStatementData {
  supplierId: string;
  supplierName: string;
  totalInvoices: number;
  totalOutstandingMinor: bigint;
  totalPaidMinor: bigint;
  currencyCode: string;
  invoices: SupplierInvoiceView[];
  activeHoldCount: number;
}

// ── Dashboard Summary ────────────────────────────────────────────────────────

/** High-level dashboard for the supplier portal. */
export interface SupplierDashboardData {
  supplierId: string;
  supplierName: string;
  currencyCode: string;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
  postedCount: number;
  voidedCount: number;
  totalOutstandingMinor: bigint;
  activeHoldCount: number;
  recentInvoices: SupplierInvoiceView[];
}

// ── Interaction DTOs ─────────────────────────────────────────────────────────

/** Input for submitting a new invoice through the supplier portal. */
export interface SubmitInvoiceInput {
  supplierId: string;
  amountMinor: bigint;
  currencyCode: string;
  dueDate?: string | null;
  poReference?: string | null;
  idempotencyKey: string;
}

/** Result after a successful invoice submission. */
export interface SubmitInvoiceOutput {
  invoiceId: string;
  invoiceNumber: string;
}
