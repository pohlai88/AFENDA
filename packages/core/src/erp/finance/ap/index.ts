/**
 * AP domain barrel — invoice state machine, holds, matching, aging.
 *
 * Functions are auto-instrumented via `instrumentService()` — every call
 * produces an OTel span named `ap.<fn_name>` with org/principal/correlation
 * attributes derived from the argument shapes.  No manual annotation needed.
 */
import { instrumentService } from "../../../kernel/infrastructure/tracing";
import * as rawInvoiceService from "./invoice.service";
import * as rawInvoiceQueries from "./invoice.queries";
import * as rawHoldService from "./hold.service";
import * as rawHoldQueries from "./hold.queries";
import * as rawPaymentRunService from "./payment-run.service";
import * as rawPaymentRunQueries from "./payment-run.queries";
import * as rawPaymentTermsService from "./payment-terms.service";
import * as rawPaymentTermsQueries from "./payment-terms.queries";

// Types are compile-time only — re-export directly
export type { InvoiceServiceError, InvoiceServiceResult, CreateInvoiceParams, SubmitInvoiceParams, MarkPaidParams, BulkInvoiceResult } from "./invoice.service";
export type { InvoiceRow, InvoiceListParams, InvoiceHistoryRow, CursorPage } from "./invoice.queries";
export type { HoldServiceError, HoldServiceResult, CreateHoldParams, ReleaseHoldParams } from "./hold.service";
export type { HoldRow } from "./hold.queries";
export type { PaymentRunServiceError, PaymentRunServiceResult, CreatePaymentRunParams, ApprovePaymentRunParams, ExecutePaymentRunParams } from "./payment-run.service";
export type { PaymentRunRow, PaymentRunListParams } from "./payment-run.queries";
export type { PaymentTermsServiceError, PaymentTermsServiceResult, CreatePaymentTermsParams, UpdatePaymentTermsParams } from "./payment-terms.service";
export type { PaymentTermsRow, PaymentTermsListParams } from "./payment-terms.queries";
import * as rawMatchToleranceService from "./match-tolerance.service";
import * as rawMatchToleranceQueries from "./match-tolerance.queries";
import * as rawPaymentRunItemService from "./payment-run-item.service";
import * as rawPaymentRunItemQueries from "./payment-run-item.queries";
import * as rawPrepaymentService from "./prepayment.service";
import * as rawPrepaymentQueries from "./prepayment.queries";
import * as rawWhtCertificateService from "./wht-certificate.service";
import * as rawWhtCertificateQueries from "./wht-certificate.queries";
import * as rawInvoiceLineService from "./invoice-line.service";
import * as rawInvoiceLineQueries from "./invoice-line.queries";
import * as rawValidateInvoice from "./validate-invoice";
import * as rawAgingService from "./aging.service";
import * as rawAgingQueries from "./aging.queries";
import * as rawPaymentRunExportService from "./payment-run-export.service";

export type { MatchToleranceServiceError, MatchToleranceServiceResult, CreateMatchToleranceParams, UpdateMatchToleranceParams, DeactivateMatchToleranceParams } from "./match-tolerance.service";
export type { MatchToleranceRow, MatchToleranceListParams } from "./match-tolerance.queries";
export type { PaymentRunItemServiceError, PaymentRunItemServiceResult, AddPaymentRunItemParams } from "./payment-run-item.service";
export type { PaymentRunItemRow } from "./payment-run-item.queries";
export type { PrepaymentServiceError, PrepaymentServiceResult, CreatePrepaymentParams, ApplyPrepaymentParams, VoidPrepaymentParams } from "./prepayment.service";
export type { PrepaymentRow, PrepaymentListParams } from "./prepayment.queries";
export type { WhtCertificateServiceError, WhtCertificateServiceResult, CreateWhtCertificateParams, IssueWhtCertificateParams, SubmitWhtCertificateParams } from "./wht-certificate.service";
export type { WhtCertificateRow, WhtCertificateListParams } from "./wht-certificate.queries";
export type { InvoiceLineServiceError, InvoiceLineServiceResult, CreateInvoiceLineParams, UpdateInvoiceLineParams } from "./invoice-line.service";
export type { InvoiceLineRow } from "./invoice-line.queries";
export type { AgingServiceResult, AgingServiceError, GetAgingParams } from "./aging.service";
export type { InvoiceAgingRow, GetInvoicesByAgingBucketParams } from "./aging.queries";
export type {
  PaymentRunExportError,
  PaymentRunExportResult,
  ExportPaymentRunISO20022Params,
  ExportPaymentRunNACHAParams,
} from "./payment-run-export.service";

// Calculators (pure functions)
export * from "./calculators/index";
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
  ...rawAgingService,
  ...rawAgingQueries,
  ...rawPaymentRunExportService,
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
  approvePaymentRun,
  executePaymentRun,
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
  applyPrepayment,
  voidPrepayment,
  listPrepayments,
  getPrepaymentById,
  createWhtCertificate,
  issueWhtCertificate,
  submitWhtCertificate,
  listWhtCertificates,
  getWhtCertificateById,
  createInvoiceLine,
  updateInvoiceLine,
  deleteInvoiceLine,
  listInvoiceLines,
  getAgingReport,
  getInvoicesByAgingBucket,
  getInvoiceLineById,
  validateInvoice,
  exportPaymentRunISO20022,
  exportPaymentRunNACHA,
} = instrumented;
