/**
 * Shared mapping helpers for the supplier portal.
 *
 * Centralizes row-to-view-model mapping to avoid duplication
 * across queries and composers.
 */

import type { SupplierInvoiceView, SupplierHoldView } from "./view-models";

/** Shape of an invoice row returned by Drizzle select or InvoiceRow. */
export interface InvoiceRowLike {
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

/** Shape of a hold row returned by Drizzle select or HoldRow. */
export interface HoldRowLike {
  id: string;
  invoiceId: string;
  holdType: string;
  holdReason: string;
  status: string;
  createdAt: Date;
  releasedAt: Date | null;
  releaseReason: string | null;
}

/** Map a raw invoice row to the portal view model. */
export function toInvoiceView(row: InvoiceRowLike): SupplierInvoiceView {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    amountMinor: row.amountMinor,
    currencyCode: row.currencyCode,
    status: row.status,
    dueDate: row.dueDate,
    poReference: row.poReference,
    submittedAt: row.submittedAt,
    paidAt: row.paidAt,
    paymentReference: row.paymentReference,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Map a raw hold row to the portal view model. */
export function toHoldView(row: HoldRowLike): SupplierHoldView {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    holdType: row.holdType,
    holdReason: row.holdReason,
    status: row.status,
    createdAt: row.createdAt,
    releasedAt: row.releasedAt,
    releaseReason: row.releaseReason,
  };
}
