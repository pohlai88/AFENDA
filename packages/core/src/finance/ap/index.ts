/**
 * AP domain barrel — invoice state machine, matching, aging.
 *
 * Functions are auto-instrumented via `instrumentService()` — every call
 * produces an OTel span named `ap.<fn_name>` with org/principal/correlation
 * attributes derived from the argument shapes.  No manual annotation needed.
 */
import { instrumentService } from "../../infra/tracing.js";
import * as rawService from "./invoice.service.js";
import * as rawQueries from "./invoice.queries.js";

// Types are compile-time only — re-export directly
export type { InvoiceServiceError, InvoiceServiceResult, SubmitInvoiceParams, MarkPaidParams } from "./invoice.service.js";
export type { InvoiceRow, InvoiceListParams, InvoiceHistoryRow, CursorPage } from "./invoice.queries.js";

// Functions — auto-wrapped with OTel spans
const instrumented = instrumentService("ap", { ...rawService, ...rawQueries });

export const {
  submitInvoice,
  approveInvoice,
  rejectInvoice,
  voidInvoice,
  markPaid,
  listInvoices,
  getInvoiceById,
  getInvoiceHistory,
} = instrumented;
