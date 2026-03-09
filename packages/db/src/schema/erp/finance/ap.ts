import {
  pgTable,
  pgEnum,
  text,
  uuid,
  date,
  bigint,
  index,
  unique,
  integer,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "../../kernel/identity.js";
import { supplier } from "../supplier.js";
import {
  InvoiceStatusValues,
  PaymentTermsStatusValues,
  HoldTypeValues,
  HoldStatusValues,
  PaymentMethodValues,
  PaymentRunStatusValues,
  PaymentRunItemStatusValues,
  PrepaymentStatusValues,
  MatchToleranceScopeValues,
  VarianceTypeValues,
  WhtTypeValues,
  WhtCertificateStatusValues,
} from "@afenda/contracts";
import { tsz, rlsOrg } from "../../_helpers.js";

export const invoiceStatusEnum = pgEnum("invoice_status", InvoiceStatusValues);
export const paymentTermsStatusEnum = pgEnum("payment_terms_status", PaymentTermsStatusValues);
export const holdTypeEnum = pgEnum("hold_type", HoldTypeValues);
export const holdStatusEnum = pgEnum("hold_status", HoldStatusValues);
export const paymentMethodEnum = pgEnum("payment_method", PaymentMethodValues);
export const paymentRunStatusEnum = pgEnum("payment_run_status", PaymentRunStatusValues);
export const paymentRunItemStatusEnum = pgEnum("payment_run_item_status", PaymentRunItemStatusValues);
export const prepaymentStatusEnum = pgEnum("prepayment_status", PrepaymentStatusValues);
export const matchToleranceScopeEnum = pgEnum("match_tolerance_scope", MatchToleranceScopeValues);
export const varianceTypeEnum = pgEnum("variance_type", VarianceTypeValues);
export const whtTypeEnum = pgEnum("wht_type", WhtTypeValues);
export const whtCertificateStatusEnum = pgEnum("wht_certificate_status", WhtCertificateStatusValues);

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE (status append-only via invoice_status_history)
// ─────────────────────────────────────────────────────────────────────────────
export const invoice = pgTable(
  "invoice",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),
    invoiceNumber: text("invoice_number").notNull(), // INV-2026-0001
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currencyCode: text("currency_code").notNull(),
    // pgEnum keeps DB values in sync with InvoiceStatusValues; default is draft.
    status: invoiceStatusEnum("status").notNull().default("draft"),
    // Date-only (YYYY-MM-DD) — AP due dates have no meaningful time-of-day.
    dueDate: date("due_date"),
    submittedByPrincipalId: uuid("submitted_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    submittedAt: tsz("submitted_at"),
    poReference: text("po_reference"), // forward-compatible hook
    // Sprint 2: payment fields — populated when status transitions to "paid"
    paidAt: tsz("paid_at"),
    paidByPrincipalId: uuid("paid_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    paymentReference: text("payment_reference"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("invoice_org_number_uidx").on(t.orgId, t.invoiceNumber),
    index("invoice_org_status_idx").on(t.orgId, t.status),
    index("invoice_supplier_idx").on(t.orgId, t.supplierId),
    index("invoice_paid_by_principal_id_idx").on(t.paidByPrincipalId),
    rlsOrg,
  ],
);

export const invoiceStatusHistory = pgTable(
  "invoice_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoice.id),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    fromStatus: invoiceStatusEnum("from_status"),
    toStatus: invoiceStatusEnum("to_status").notNull(),
    actorPrincipalId: uuid("actor_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    correlationId: text("correlation_id").notNull(),
    reason: text("reason"),
    occurredAt: tsz("occurred_at").defaultNow().notNull(),
  },
  (t) => [
    index("inv_status_history_invoice_idx").on(t.invoiceId),
    index("inv_status_history_org_idx").on(t.orgId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT TERMS (defines due dates and early payment discounts)
// Examples: NET30, 2/10NET30, NET45
// ─────────────────────────────────────────────────────────────────────────────
export const paymentTerms = pgTable(
  "payment_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** Unique code within org, e.g., "NET30", "2/10NET30" */
    code: text("code").notNull(),
    /** Human-readable description */
    description: text("description").notNull(),
    /** Days until payment is due (from invoice date) */
    netDays: integer("net_days").notNull(),
    /** Early payment discount percentage (e.g., 2.00 for 2%). Null = no discount. */
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
    /** Days within which the discount applies. Null = no discount. */
    discountDays: integer("discount_days"),
    /** Status: active or inactive */
    status: paymentTermsStatusEnum("status").notNull().default("active"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("payment_terms_org_code_uidx").on(t.orgId, t.code),
    index("payment_terms_org_status_idx").on(t.orgId, t.status),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// AP HOLD (blocks invoice approval/payment)
// Holds are append-only — never deleted, only released.
// ─────────────────────────────────────────────────────────────────────────────
export const apHold = pgTable(
  "ap_hold",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "cascade" }),
    /** Type of hold (DUPLICATE, PRICE_VARIANCE, etc.) */
    holdType: holdTypeEnum("hold_type").notNull(),
    /** Human-readable reason for the hold */
    holdReason: text("hold_reason").notNull(),
    /** Status: active or released */
    status: holdStatusEnum("status").notNull().default("active"),
    /** Principal who created the hold */
    createdByPrincipalId: uuid("created_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    /** When the hold was released (null if still active) */
    releasedAt: tsz("released_at"),
    /** Principal who released the hold */
    releasedByPrincipalId: uuid("released_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    /** Reason for releasing the hold */
    releaseReason: text("release_reason"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("ap_hold_invoice_idx").on(t.invoiceId),
    index("ap_hold_org_status_idx").on(t.orgId, t.status),
    index("ap_hold_org_invoice_status_idx").on(t.orgId, t.invoiceId, t.status),
    index("ap_hold_created_by_principal_id_idx").on(t.createdByPrincipalId),
    index("ap_hold_released_by_principal_id_idx").on(t.releasedByPrincipalId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE LINE (individual line items on an AP invoice)
// Line totals roll up to invoice.amountMinor.
// ─────────────────────────────────────────────────────────────────────────────
export const invoiceLine = pgTable(
  "invoice_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "cascade" }),
    /** Line number within the invoice (1-based) */
    lineNumber: integer("line_number").notNull(),
    /** Description of goods/services */
    description: text("description").notNull(),
    /** Quantity (integer units) */
    quantity: integer("quantity").notNull(),
    /** Unit price in minor units (cents) */
    unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
    /** Line total in minor units (quantity * unitPriceMinor) */
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    /** GL account for expense coding (optional) */
    glAccountId: uuid("gl_account_id"),
    /** Tax code (e.g., "VAT20", "EXEMPT") */
    taxCode: text("tax_code"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("invoice_line_org_invoice_number_uidx").on(t.orgId, t.invoiceId, t.lineNumber),
    index("invoice_line_invoice_idx").on(t.invoiceId),
    index("invoice_line_org_idx").on(t.orgId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT RUN — batch payment execution for AP invoices.
// Groups multiple invoices for efficient payment processing.
// Lifecycle: DRAFT → APPROVED → EXECUTING → EXECUTED (or CANCELLED/REVERSED)
// ─────────────────────────────────────────────────────────────────────────────
export const paymentRun = pgTable(
  "payment_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Human-readable run number (e.g., "PR-2026-0001") */
    runNumber: text("run_number").notNull(),
    /** Optional description/notes */
    description: text("description"),

    /** Payment method for this run */
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    /** ISO 4217 currency code (all items must match) */
    currencyCode: text("currency_code").notNull(),

    /** Scheduled payment date */
    paymentDate: date("payment_date").notNull(),

    /** Total amount in minor units (sum of all items) */
    totalAmountMinor: bigint("total_amount_minor", { mode: "bigint" }).notNull().default(BigInt(0)),
    /** Total early payment discount taken in minor units */
    totalDiscountMinor: bigint("total_discount_minor", { mode: "bigint" }).notNull().default(BigInt(0)),
    /** Number of items in this run */
    itemCount: integer("item_count").notNull().default(0),

    /** Current status */
    status: paymentRunStatusEnum("status").notNull().default("DRAFT"),

    // Approval tracking
    approvedByPrincipalId: uuid("approved_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    approvedAt: tsz("approved_at"),

    // Execution tracking
    executedByPrincipalId: uuid("executed_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    executedAt: tsz("executed_at"),
    bankReference: text("bank_reference"),

    // Reversal tracking
    reversedByPrincipalId: uuid("reversed_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    reversedAt: tsz("reversed_at"),
    reversalReason: text("reversal_reason"),

    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("payment_run_org_number_uidx").on(t.orgId, t.runNumber),
    index("payment_run_org_status_idx").on(t.orgId, t.status),
    index("payment_run_org_date_idx").on(t.orgId, t.paymentDate),
    index("payment_run_approved_by_principal_id_idx").on(t.approvedByPrincipalId),
    index("payment_run_executed_by_principal_id_idx").on(t.executedByPrincipalId),
    index("payment_run_reversed_by_principal_id_idx").on(t.reversedByPrincipalId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT RUN ITEM — individual invoice payment within a payment run.
// Each item represents a payment to be made for a specific invoice.
// ─────────────────────────────────────────────────────────────────────────────
export const paymentRunItem = pgTable(
  "payment_run_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    paymentRunId: uuid("payment_run_id")
      .notNull()
      .references(() => paymentRun.id, { onDelete: "cascade" }),

    /** The invoice being paid */
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "cascade" }),
    /** The supplier receiving payment (denormalized for reporting) */
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),

    /** Invoice number (denormalized for display) */
    invoiceNumber: text("invoice_number").notNull(),
    /** Invoice due date (denormalized for sorting) */
    invoiceDueDate: date("invoice_due_date").notNull(),

    /** Original invoice amount in minor units */
    invoiceAmountMinor: bigint("invoice_amount_minor", { mode: "bigint" }).notNull(),
    /** Amount being paid in minor units */
    amountPaidMinor: bigint("amount_paid_minor", { mode: "bigint" }).notNull(),
    /** Early payment discount taken in minor units */
    discountTakenMinor: bigint("discount_taken_minor", { mode: "bigint" }).notNull().default(BigInt(0)),

    /** Current status */
    status: paymentRunItemStatusEnum("status").notNull().default("PENDING"),

    /** Bank reference for this specific payment (if available) */
    paymentReference: text("payment_reference"),
    /** Error message if payment failed */
    errorMessage: text("error_message"),

    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("payment_run_item_org_run_invoice_uidx").on(t.orgId, t.paymentRunId, t.invoiceId),
    index("payment_run_item_run_idx").on(t.paymentRunId),
    index("payment_run_item_invoice_idx").on(t.invoiceId),
    index("payment_run_item_org_idx").on(t.orgId),
    index("payment_run_item_supplier_id_idx").on(t.supplierId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// PREPAYMENT — advance payments to suppliers before invoice receipt.
// Tracks available balance that can be applied to future invoices.
// Lifecycle: PENDING → AVAILABLE → DEPLETED (or VOIDED)
// ─────────────────────────────────────────────────────────────────────────────
export const prepayment = pgTable(
  "prepayment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),

    /** Human-readable prepayment number (e.g., "PP-2026-0001") */
    prepaymentNumber: text("prepayment_number").notNull(),
    /** Optional description */
    description: text("description"),
    /** ISO 4217 currency code */
    currencyCode: text("currency_code").notNull(),
    /** Original prepayment amount in minor units */
    originalAmountMinor: bigint("original_amount_minor", { mode: "bigint" }).notNull(),
    /** Remaining balance available for application in minor units */
    balanceMinor: bigint("balance_minor", { mode: "bigint" }).notNull(),
    /** Date payment was made */
    paymentDate: date("payment_date").notNull(),
    /** Bank/payment reference */
    paymentReference: text("payment_reference").notNull(),

    /** Current status */
    status: prepaymentStatusEnum("status").notNull().default("PENDING"),

    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("prepayment_org_number_uidx").on(t.orgId, t.prepaymentNumber),
    index("prepayment_org_status_idx").on(t.orgId, t.status),
    index("prepayment_supplier_idx").on(t.orgId, t.supplierId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// PREPAYMENT APPLICATION — records application of prepayment to invoice.
// Append-only: once applied, creates a permanent record of the application.
// ─────────────────────────────────────────────────────────────────────────────
export const prepaymentApplication = pgTable(
  "prepayment_application",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    prepaymentId: uuid("prepayment_id")
      .notNull()
      .references(() => prepayment.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "cascade" }),

    /** Amount applied in minor units */
    appliedAmountMinor: bigint("applied_amount_minor", { mode: "bigint" }).notNull(),
    /** When the application occurred */
    appliedAt: tsz("applied_at").notNull(),
    /** Principal who applied the prepayment */
    appliedByPrincipalId: uuid("applied_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),

    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("prepay_app_prepayment_idx").on(t.prepaymentId),
    index("prepay_app_invoice_idx").on(t.invoiceId),
    index("prepay_app_org_idx").on(t.orgId),
    index("prepay_app_applied_by_principal_id_idx").on(t.appliedByPrincipalId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// MATCH TOLERANCE — variance tolerance rules for invoice matching.
// Supports hierarchical scopes: ORG > SUPPLIER > SUPPLIER_SITE > PO
// ─────────────────────────────────────────────────────────────────────────────
export const matchTolerance = pgTable(
  "match_tolerance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Scope level (ORG, SUPPLIER, SUPPLIER_SITE, PO) */
    scope: matchToleranceScopeEnum("scope").notNull(),
    /** ID of entity for scope (supplierId, siteId, poId); null for ORG */
    scopeEntityId: uuid("scope_entity_id"),
    /** Variance type this tolerance applies to */
    varianceType: varianceTypeEnum("variance_type").notNull(),

    /** Human-readable name */
    name: text("name").notNull(),
    /** Optional description */
    description: text("description"),

    /** Maximum tolerance percentage (e.g., 5.00 for 5%) */
    tolerancePercent: numeric("tolerance_percent", { precision: 5, scale: 2 }).notNull(),
    /** Maximum absolute tolerance amount in minor units (optional cap) */
    maxAmountMinor: bigint("max_amount_minor", { mode: "bigint" }),
    /** Currency for maxAmountMinor (if applicable) */
    currencyCode: text("currency_code"),

    /** Priority for conflict resolution (lower = higher priority) */
    priority: integer("priority").notNull().default(100),
    /** Whether this tolerance is active */
    isActive: integer("is_active").notNull().default(1),

    /** Effective date range */
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),

    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("match_tol_org_scope_entity_type_uidx").on(t.orgId, t.scope, t.scopeEntityId, t.varianceType),
    index("match_tol_org_scope_idx").on(t.orgId, t.scope),
    index("match_tol_org_active_idx").on(t.orgId, t.isActive),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// WHT CERTIFICATE — withholding tax certificates for tax compliance.
// Generated when WHT is deducted from supplier payments.
// Lifecycle: DRAFT → ISSUED → SUBMITTED (or VOIDED)
// ─────────────────────────────────────────────────────────────────────────────
export const whtCertificate = pgTable(
  "wht_certificate",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),

    /** Official certificate number */
    certificateNumber: text("certificate_number").notNull(),
    /** Type of withholding tax */
    whtType: whtTypeEnum("wht_type").notNull(),
    /** Tax jurisdiction code */
    jurisdictionCode: text("jurisdiction_code").notNull(),

    /** ISO 4217 currency code */
    currencyCode: text("currency_code").notNull(),
    /** Gross payment amount in minor units (before WHT) */
    grossAmountMinor: bigint("gross_amount_minor", { mode: "bigint" }).notNull(),
    /** WHT rate applied (percentage) */
    whtRatePercent: numeric("wht_rate_percent", { precision: 5, scale: 2 }).notNull(),
    /** WHT amount deducted in minor units */
    whtAmountMinor: bigint("wht_amount_minor", { mode: "bigint" }).notNull(),
    /** Net payment amount in minor units (after WHT) */
    netAmountMinor: bigint("net_amount_minor", { mode: "bigint" }).notNull(),

    /** Tax period (e.g., "2026-Q1") */
    taxPeriod: text("tax_period").notNull(),
    /** Date the certificate covers */
    certificateDate: date("certificate_date").notNull(),

    /** Payment run this certificate relates to (optional) */
    paymentRunId: uuid("payment_run_id").references(() => paymentRun.id, {
      onDelete: "set null",
    }),

    /** Current status */
    status: whtCertificateStatusEnum("status").notNull().default("DRAFT"),

    /** Date issued to supplier */
    issuedAt: tsz("issued_at"),
    /** Date submitted to tax authority */
    submittedAt: tsz("submitted_at"),
    /** Tax authority reference number */
    taxAuthorityReference: text("tax_authority_reference"),

    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("wht_cert_org_number_uidx").on(t.orgId, t.certificateNumber),
    index("wht_cert_org_status_idx").on(t.orgId, t.status),
    index("wht_cert_supplier_idx").on(t.orgId, t.supplierId),
    index("wht_cert_payment_run_idx").on(t.paymentRunId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// WHT EXEMPTION — reduced/zero WHT for qualifying suppliers.
// Supports treaty benefits and tax exemptions.
// ─────────────────────────────────────────────────────────────────────────────
export const whtExemption = pgTable(
  "wht_exemption",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),

    /** Type of WHT this exemption covers */
    whtType: whtTypeEnum("wht_type").notNull(),
    /** Tax jurisdiction for this exemption */
    jurisdictionCode: text("jurisdiction_code").notNull(),

    /** Reason for exemption */
    exemptionReason: text("exemption_reason").notNull(),
    /** Exemption certificate/document number */
    exemptionDocumentNumber: text("exemption_document_number"),

    /** Reduced rate (0 for full exemption, or reduced percentage) */
    reducedRatePercent: numeric("reduced_rate_percent", { precision: 5, scale: 2 }).notNull().default("0"),

    /** Exemption valid from */
    validFrom: date("valid_from").notNull(),
    /** Exemption valid to */
    validTo: date("valid_to").notNull(),
    /** Whether this exemption is currently active */
    isActive: integer("is_active").notNull().default(1),

    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("wht_exempt_org_supplier_type_juris_uidx").on(t.orgId, t.supplierId, t.whtType, t.jurisdictionCode),
    index("wht_exempt_supplier_idx").on(t.orgId, t.supplierId),
    index("wht_exempt_org_active_idx").on(t.orgId, t.isActive),
    rlsOrg,
  ],
);
