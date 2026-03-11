/**
 * Supplier Portal Projections
 *
 * Projection layer for supplier-facing portal experiences.
 *
 * Dominant domain: Accounts Payable (AP)
 * Supporting domains: Supplier Identity
 *
 * ## Projection Classes
 *
 * - **Class A (Queries):** Invoice list, invoice detail, invoice holds
 * - **Class B (Composers):** Supplier statement, supplier dashboard
 * - **Class C (Interactions):** Submit invoice from portal
 */

// Types (view models)
export type {
  SupplierInvoiceView,
  SupplierHoldView,
  SupplierStatementData,
  SupplierDashboardData,
  SubmitInvoiceInput,
  SubmitInvoiceOutput,
} from "./types/index";

// Queries (Class A)
export {
  getSupplierInvoices,
  getSupplierInvoiceDetail,
  getSupplierInvoiceHolds,
} from "./queries/index";
export type {
  GetSupplierInvoicesParams,
  GetInvoiceDetailParams,
  GetInvoiceHoldsParams,
} from "./queries/index";

// Composers (Class B)
export {
  buildSupplierStatement,
  buildSupplierDashboard,
} from "./composers/index";
export type {
  BuildStatementParams,
  BuildDashboardParams,
} from "./composers/index";

// Interactions (Class C)
export { submitInvoiceFromPortal } from "./interactions/index";

// Policies
export {
  canViewSupplierInvoices,
  canSubmitSupplierInvoice,
  canViewSupplierHolds,
} from "./policies/index";
