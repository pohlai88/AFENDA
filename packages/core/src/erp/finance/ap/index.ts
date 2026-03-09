/**
 * AP domain barrel — invoice state machine, holds, matching, aging.
 *
 * Functions are auto-instrumented via `instrumentService()` — every call
 * produces an OTel span named `ap.<fn_name>` with org/principal/correlation
 * attributes derived from the argument shapes.  No manual annotation needed.
 */
import { instrumentService } from "../../../kernel/infrastructure/tracing.js";
import * as rawInvoiceService from "./invoice.service.js";
import * as rawInvoiceQueries from "./invoice.queries.js";
import * as rawHoldService from "./hold.service.js";
import * as rawHoldQueries from "./hold.queries.js";
import * as rawPaymentRunService from "./payment-run.service.js";
import * as rawPaymentRunQueries from "./payment-run.queries.js";
import * as rawPaymentTermsService from "./payment-terms.service.js";
import * as rawPaymentTermsQueries from "./payment-terms.queries.js";

// Types are compile-time only — re-export directly
export type { InvoiceServiceError, InvoiceServiceResult, CreateInvoiceParams, SubmitInvoiceParams, MarkPaidParams, BulkInvoiceResult } from "./invoice.service.js";
export type { InvoiceRow, InvoiceListParams, InvoiceHistoryRow, CursorPage } from "./invoice.queries.js";
export type { HoldServiceError, HoldServiceResult, CreateHoldParams, ReleaseHoldParams } from "./hold.service.js";
export type { HoldRow } from "./hold.queries.js";
export type { PaymentRunServiceError, PaymentRunServiceResult, CreatePaymentRunParams } from "./payment-run.service.js";
export type { PaymentRunRow, PaymentRunListParams } from "./payment-run.queries.js";
export type { PaymentTermsServiceError, PaymentTermsServiceResult, CreatePaymentTermsParams, UpdatePaymentTermsParams } from "./payment-terms.service.js";
export type { PaymentTermsRow, PaymentTermsListParams } from "./payment-terms.queries.js";
import * as rawMatchToleranceService from "./match-tolerance.service.js";
import * as rawMatchToleranceQueries from "./match-tolerance.queries.js";
import * as rawPaymentRunItemService from "./payment-run-item.service.js";
import * as rawPaymentRunItemQueries from "./payment-run-item.queries.js";
import * as rawPrepaymentService from "./prepayment.service.js";
import * as rawPrepaymentQueries from "./prepayment.queries.js";
import * as rawWhtCertificateService from "./wht-certificate.service.js";
import * as rawWhtCertificateQueries from "./wht-certificate.queries.js";
import * as rawInvoiceLineService from "./invoice-line.service.js";
import * as rawInvoiceLineQueries from "./invoice-line.queries.js";
import * as rawValidateInvoice from "./validate-invoice.js";

export type { MatchToleranceServiceError, MatchToleranceServiceResult, CreateMatchToleranceParams, UpdateMatchToleranceParams, DeactivateMatchToleranceParams } from "./match-tolerance.service.js";
export type { MatchToleranceRow, MatchToleranceListParams } from "./match-tolerance.queries.js";
export type { PaymentRunItemServiceError, PaymentRunItemServiceResult, AddPaymentRunItemParams } from "./payment-run-item.service.js";
export type { PaymentRunItemRow } from "./payment-run-item.queries.js";
export type { PrepaymentServiceError, PrepaymentServiceResult, CreatePrepaymentParams } from "./prepayment.service.js";
export type { PrepaymentRow, PrepaymentListParams } from "./prepayment.queries.js";
export type { WhtCertificateServiceError, WhtCertificateServiceResult, CreateWhtCertificateParams } from "./wht-certificate.service.js";
export type { WhtCertificateRow, WhtCertificateListParams } from "./wht-certificate.queries.js";
export type { InvoiceLineServiceError, InvoiceLineServiceResult, CreateInvoiceLineParams, UpdateInvoiceLineParams } from "./invoice-line.service.js";
export type { InvoiceLineRow } from "./invoice-line.queries.js";

// Functions — auto-wrapped with OTel spans
const instrumented = instrumentService("ap", {
  ...rawInvoiceService,
  ...rawInvoiceQueries,
  ...rawHoldService,
  ...rawHoldQueries,
  ...rawPaymentRunService,
  ...rawPaymentRunQueries,
  ...rawPaymentTermsService,
  ...rawPaymentTermsQueries,
  ...rawMatchToleranceService,
  ...rawMatchToleranceQueries,
  ...rawPaymentRunItemService,
  ...rawPaymentRunItemQueries,
  ...rawPrepaymentService,
  ...rawPrepaymentQueries,
  ...rawWhtCertificateService,
  ...rawWhtCertificateQueries,
  ...rawInvoiceLineService,
  ...rawInvoiceLineQueries,
  ...rawValidateInvoice,
});

export const {
  createInvoice,
  submitDraftInvoice,
  submitInvoice,
  approveInvoice,
  rejectInvoice,
  voidInvoice,
  bulkApproveInvoices,
  bulkRejectInvoices,
  bulkVoidInvoices,
  markPaid,
  listInvoices,
  getInvoiceById,
  getInvoiceHistory,
  createHold,
  releaseHold,
  hasActiveHolds,
  findHoldsByInvoice,
  getHoldById,
  createPaymentRun,
  listPaymentRuns,
  getPaymentRunById,
  createPaymentTerms,
  updatePaymentTerms,
  listPaymentTerms,
  getPaymentTermsById,
  getPaymentTermsByCode,
  createMatchTolerance,
  updateMatchTolerance,
  deactivateMatchTolerance,
  listMatchTolerances,
  getMatchToleranceById,
  addPaymentRunItem,
  listPaymentRunItems,
  getPaymentRunItemById,
  createPrepayment,
  listPrepayments,
  getPrepaymentById,
  createWhtCertificate,
  listWhtCertificates,
  getWhtCertificateById,
  createInvoiceLine,
  updateInvoiceLine,
  deleteInvoiceLine,
  listInvoiceLines,
  getInvoiceLineById,
  validateInvoice,
} = instrumented;
