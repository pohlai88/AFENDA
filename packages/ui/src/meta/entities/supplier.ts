/**
 * supplier.supplier — entity registration with list + form views, flow, and actions.
 *
 * RULES:
 *   1. ZERO React imports — pure TS metadata.
 *   2. Imports from `@afenda/contracts` only (boundary law).
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

const entityDef: EntityDef = {
  entityKey: "supplier.supplier",
  domainKey: "supplier",
  labelSingular: "Supplier",
  labelPlural: "Suppliers",
  primaryFieldKey: "name",
  recordTitleTemplate: "{name}",
};

const fieldDefs: readonly FieldDefInput[] = [
  { fieldKey: "id", fieldType: "string", label: "ID", readonly: true },
  {
    fieldKey: "name",
    fieldType: "string",
    label: "Name",
    required: true,
    validationJson: { maxLength: 255 },
  },
  { fieldKey: "taxId", fieldType: "string", label: "Tax ID" },
  { fieldKey: "contactEmail", fieldType: "string", label: "Email" },
  {
    fieldKey: "status",
    fieldType: "enum",
    label: "Status",
    readonly: true,
    enumValues: ["draft", "active", "suspended"],
  },
  {
    fieldKey: "orgId",
    fieldType: "relation",
    label: "Organization",
    readonly: true,
    relationEntityKey: "iam.organization",
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
];

const defaultListView: ListViewDefInput = {
  viewType: "list",
  viewKey: "default",
  version: 1,
  label: "Suppliers",
  columns: [
    { fieldKey: "name", renderer: "text" },
    { fieldKey: "taxId", renderer: "text" },
    { fieldKey: "contactEmail", renderer: "text" },
    { fieldKey: "status", renderer: "badge" },
    { fieldKey: "createdAt", renderer: "datetime" },
  ],
  filters: [{ fieldKey: "status" }],
  rowActions: [
    { actionKey: "supplier.activate", label: "Activate", confirm: true },
    { actionKey: "supplier.suspend", label: "Suspend", variant: "destructive", confirm: true },
  ],
  queryProfile: {
    apiEndpoint: "/v1/suppliers",
    defaultSort: { field: "name", direction: "asc" },
  },
};

const detailFormView: FormViewDefInput = {
  viewType: "form",
  viewKey: "detail",
  version: 1,
  label: "Supplier Detail",
  commandSchemaRef: "OnboardSupplierCommandSchema",
  tabs: [
    {
      tabKey: "details",
      label: "Details",
      sections: [
        {
          sectionKey: "info",
          label: "Supplier Information",
          columns: 2,
          fields: [
            { fieldKey: "name", colSpan: 1 },
            { fieldKey: "status", colSpan: 1 },
            { fieldKey: "taxId", colSpan: 1 },
            { fieldKey: "contactEmail", colSpan: 1 },
          ],
        },
      ],
    },
  ],
  sidePanels: [
    { panelKey: "audit", label: "Audit Log", panelType: "audit" },
  ],
  guards: [
    {
      permission: "supplier.onboard",
      denyMessage: "You don't have permission to manage suppliers.",
    },
  ],
};

const flowDef: FlowDefInput = {
  entityKey: "supplier.supplier",
  states: [
    { stateKey: "draft", label: "Draft" },
    { stateKey: "active", label: "Active" },
    { stateKey: "suspended", label: "Suspended", terminal: true },
  ],
  transitions: [
    {
      from: "draft",
      to: "active",
      label: "Activate",
      actionKey: "supplier.activate",
      guard: { permission: "supplier.onboard" },
    },
    {
      from: "active",
      to: "suspended",
      label: "Suspend",
      actionKey: "supplier.suspend",
      guard: { permission: "supplier.onboard" },
    },
  ],
};

const actions: readonly ActionDef[] = [
  {
    actionKey: "supplier.create",
    label: "New Supplier",
    route: "/suppliers/new",
    viewKey: "detail",
    actionType: "navigate",
    menuPath: "supplier",
  },
  {
    actionKey: "supplier.activate",
    label: "Activate",
    actionType: "inline",
  },
  {
    actionKey: "supplier.suspend",
    label: "Suspend",
    actionType: "modal",
  },
] as const;

export const supplierSupplier: EntityRegistration = {
  entityDef,
  fieldDefs,
  views: {
    default: defaultListView,
    detail: detailFormView,
  },
  actions,
  flowDef,
};
