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
} from "./types/index.js";

// Queries (Class A)
export {
  getSupplierInvoices,
  getSupplierInvoiceDetail,
  getSupplierInvoiceHolds,
} from "./queries/index.js";
export type {
  GetSupplierInvoicesParams,
  GetInvoiceDetailParams,
  GetInvoiceHoldsParams,
} from "./queries/index.js";

// Composers (Class B)
export {
  buildSupplierStatement,
  buildSupplierDashboard,
} from "./composers/index.js";
export type {
  BuildStatementParams,
  BuildDashboardParams,
} from "./composers/index.js";

// Interactions (Class C)
export { submitInvoiceFromPortal } from "./interactions/index.js";

// Policies
export {
  canViewSupplierInvoices,
  canSubmitSupplierInvoice,
  canViewSupplierHolds,
} from "./policies/index.js";
