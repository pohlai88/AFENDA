/**
 * finance.ap_invoice — reference entity registration.
 *
 * This is the first fully-defined entity proving the autogen pipeline:
 * entity → fields → views → flow → actions.
 *
 * RULES:
 *   1. ZERO React imports — pure TS metadata.
 *   2. Imports from `@afenda/contracts` only (boundary law).
 *   3. Field types, renderers, and permissions use the canonical values
 *      from contracts/meta and contracts/iam.
 */
import type { EntityRegistration } from "../types";
import type {
  EntityDef,
  FieldDefInput,
  ListViewDefInput,
  FormViewDefInput,
  FlowDefInput,
  ActionDef,
} from "@afenda/contracts";

// ── Entity ────────────────────────────────────────────────────────────────────

const entityDef: EntityDef = {
  entityKey: "finance.ap_invoice",
  domainKey: "finance",
  labelSingular: "Invoice",
  labelPlural: "Invoices",
  primaryFieldKey: "invoiceNumber",
  recordTitleTemplate: "Invoice #{invoiceNumber}",
};

// ── Fields ────────────────────────────────────────────────────────────────────

const fieldDefs: readonly FieldDefInput[] = [
  {
    fieldKey: "id",
    fieldType: "string",
    label: "ID",
    readonly: true,
  },
  {
    fieldKey: "orgId",
    fieldType: "relation",
    label: "Organization",
    readonly: true,
    relationEntityKey: "iam.organization",
  },
  {
    fieldKey: "supplierId",
    fieldType: "relation",
    label: "Supplier",
    required: true,
    relationEntityKey: "supplier.supplier",
  },
  {
    fieldKey: "invoiceNumber",
    fieldType: "string",
    label: "Invoice Number",
    required: true,
    validationJson: { minLength: 1, maxLength: 64 },
  },
  {
    fieldKey: "amountMinor",
    fieldType: "money",
    label: "Amount",
    required: true,
    description: "Minor-unit amount (cents, fils). Negative = credit note.",
  },
  {
    fieldKey: "currencyCode",
    fieldType: "string",
    label: "Currency",
    required: true,
    validationJson: { pattern: "^[A-Z]{3}$" },
  },
  {
    fieldKey: "status",
    fieldType: "enum",
    label: "Status",
    readonly: true,
    enumValues: [
      "draft",
      "submitted",
      "approved",
      "posted",
      "paid",
      "rejected",
      "voided",
    ],
  },
  {
    fieldKey: "dueDate",
    fieldType: "date",
    label: "Due Date",
  },
  {
    fieldKey: "submittedByPrincipalId",
    fieldType: "relation",
    label: "Submitted By",
    readonly: true,
    relationEntityKey: "iam.principal",
  },
  {
    fieldKey: "submittedAt",
    fieldType: "datetime",
    label: "Submitted At",
    readonly: true,
  },
  {
    fieldKey: "poReference",
    fieldType: "string",
    label: "PO Reference",
    validationJson: { maxLength: 64 },
  },
  {
    fieldKey: "paidAt",
    fieldType: "datetime",
    label: "Paid At",
    readonly: true,
  },
  {
    fieldKey: "paidByPrincipalId",
    fieldType: "relation",
    label: "Paid By",
    readonly: true,
    relationEntityKey: "iam.principal",
  },
  {
    fieldKey: "paymentReference",
    fieldType: "string",
    label: "Payment Reference",
    readonly: true,
    validationJson: { maxLength: 128 },
  },
  {
    fieldKey: "createdAt",
    fieldType: "datetime",
    label: "Created",
    readonly: true,
  },
  {
    fieldKey: "updatedAt",
    fieldType: "datetime",
    label: "Updated",
    readonly: true,
  },
] as const;

// ── List View ─────────────────────────────────────────────────────────────────

const defaultListView: ListViewDefInput = {
  viewType: "list",
  viewKey: "default",
  version: 1,
  label: "AP Invoices",
  columns: [
    { fieldKey: "invoiceNumber", renderer: "text" },
    { fieldKey: "supplierId", renderer: "relation" },
    { fieldKey: "amountMinor", renderer: "money", align: "right" },
    { fieldKey: "currencyCode", renderer: "text", width: 80 },
    { fieldKey: "status", renderer: "badge" },
    { fieldKey: "dueDate", renderer: "date" },
    { fieldKey: "submittedAt", renderer: "datetime" },
  ],
  filters: [
    { fieldKey: "status" },
    { fieldKey: "supplierId" },
    { fieldKey: "dueDate" },
  ],
  rowActions: [
    { actionKey: "invoice.approve", label: "Approve", confirm: true },
    {
      actionKey: "invoice.reject",
      label: "Reject",
      variant: "destructive",
      confirm: true,
    },
    {
      actionKey: "invoice.void",
      label: "Void",
      variant: "destructive",
      confirm: true,
    },
  ],
  queryProfile: {
    apiEndpoint: "/v1/invoices",
    selectFields: [
      "id",
      "invoiceNumber",
      "supplierId",
      "amountMinor",
      "currencyCode",
      "status",
      "dueDate",
      "submittedAt",
    ],
    defaultSort: { field: "createdAt", direction: "desc" },
  },
};

// ── Form View ─────────────────────────────────────────────────────────────────

const defaultFormView: FormViewDefInput = {
  viewType: "form",
  viewKey: "detail",
  version: 1,
  label: "Invoice Detail",
  commandSchemaRef: "SubmitInvoiceCommandSchema",
  tabs: [
    {
      tabKey: "details",
      label: "Details",
      sections: [
        {
          sectionKey: "header",
          label: "Invoice Header",
          columns: 2,
          fields: [
            { fieldKey: "invoiceNumber", colSpan: 1 },
            { fieldKey: "status", colSpan: 1 },
            { fieldKey: "supplierId", colSpan: 1 },
            { fieldKey: "poReference", colSpan: 1 },
          ],
        },
        {
          sectionKey: "amounts",
          label: "Amounts",
          columns: 2,
          fields: [
            { fieldKey: "amountMinor", colSpan: 1 },
            { fieldKey: "currencyCode", colSpan: 1 },
            { fieldKey: "dueDate", colSpan: 1 },
          ],
        },
      ],
    },
    {
      tabKey: "timeline",
      label: "Timeline",
      sections: [
        {
          sectionKey: "submission",
          label: "Submission",
          columns: 2,
          fields: [
            { fieldKey: "submittedByPrincipalId", colSpan: 1 },
            { fieldKey: "submittedAt", colSpan: 1 },
          ],
        },
        {
          sectionKey: "payment",
          label: "Payment",
          columns: 2,
          fields: [
            { fieldKey: "paidByPrincipalId", colSpan: 1 },
            { fieldKey: "paidAt", colSpan: 1 },
            { fieldKey: "paymentReference", colSpan: 2 },
          ],
        },
      ],
    },
  ],
  sidePanels: [
    { panelKey: "evidence", label: "Evidence", panelType: "evidence" },
    { panelKey: "audit", label: "Audit Log", panelType: "audit" },
  ],
  guards: [
    {
      permission: "ap.invoice.submit",
      denyMessage: "You don't have permission to view invoices.",
    },
  ],
};

// ── Flow ──────────────────────────────────────────────────────────────────────

const flowDef: FlowDefInput = {
  entityKey: "finance.ap_invoice",
  states: [
    { stateKey: "draft", label: "Draft" },
    { stateKey: "submitted", label: "Submitted" },
    { stateKey: "approved", label: "Approved" },
    { stateKey: "posted", label: "Posted" },
    { stateKey: "paid", label: "Paid", terminal: true },
    { stateKey: "rejected", label: "Rejected", terminal: true },
    { stateKey: "voided", label: "Voided", terminal: true },
  ],
  transitions: [
    {
      from: "draft",
      to: "submitted",
      label: "Submit",
      actionKey: "invoice.submit",
      guard: { permission: "ap.invoice.submit" },
    },
    {
      from: "submitted",
      to: "approved",
      label: "Approve",
      actionKey: "invoice.approve",
      guard: { permission: "ap.invoice.approve" },
    },
    {
      from: "submitted",
      to: "rejected",
      label: "Reject",
      actionKey: "invoice.reject",
      guard: { permission: "ap.invoice.approve" },
    },
    {
      from: "approved",
      to: "posted",
      label: "Post to GL",
      actionKey: "invoice.post",
      guard: { permission: "gl.journal.post" },
      evidenceRequired: true,
    },
    {
      from: "posted",
      to: "paid",
      label: "Mark Paid",
      actionKey: "invoice.markPaid",
      guard: { permission: "ap.invoice.markpaid" },
    },
    {
      from: "submitted",
      to: "voided",
      label: "Void",
      actionKey: "invoice.void",
      guard: { permission: "ap.invoice.submit" },
    },
    {
      from: "approved",
      to: "voided",
      label: "Void",
      actionKey: "invoice.void",
      guard: { permission: "ap.invoice.approve" },
    },
  ],
};

// ── Actions ───────────────────────────────────────────────────────────────────

const actions: readonly ActionDef[] = [
  {
    actionKey: "invoice.create",
    label: "New Invoice",
    route: "/finance/ap/invoices/new",
    viewKey: "detail",
    actionType: "navigate",
    menuPath: "finance/ap",
  },
  {
    actionKey: "invoice.submit",
    label: "Submit",
    actionType: "inline",
  },
  {
    actionKey: "invoice.approve",
    label: "Approve",
    actionType: "inline",
  },
  {
    actionKey: "invoice.reject",
    label: "Reject",
    actionType: "modal",
  },
  {
    actionKey: "invoice.void",
    label: "Void",
    actionType: "modal",
  },
  {
    actionKey: "invoice.post",
    label: "Post to GL",
    actionType: "inline",
  },
  {
    actionKey: "invoice.markPaid",
    label: "Mark Paid",
    actionType: "modal",
  },
] as const;

// ── Registration ──────────────────────────────────────────────────────────────

export const financeApInvoice: EntityRegistration = {
  entityDef,
  fieldDefs,
  views: {
    default: defaultListView,
    detail: defaultFormView,
  },
  actions,
  flowDef,
};
