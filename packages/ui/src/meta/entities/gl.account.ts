/**
 * gl.account — entity registration with list + form views and actions.
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
  ActionDef,
} from "@afenda/contracts";

const entityDef: EntityDef = {
  entityKey: "gl.account",
  domainKey: "gl",
  labelSingular: "Account",
  labelPlural: "Accounts",
  primaryFieldKey: "code",
  recordTitleTemplate: "{code} — {name}",
};

const fieldDefs: readonly FieldDefInput[] = [
  { fieldKey: "id", fieldType: "string", label: "ID", readonly: true },
  {
    fieldKey: "code",
    fieldType: "string",
    label: "Code",
    required: true,
    validationJson: { pattern: "^[A-Z0-9.-]+$", maxLength: 32 },
  },
  {
    fieldKey: "name",
    fieldType: "string",
    label: "Name",
    required: true,
    validationJson: { maxLength: 255 },
  },
  {
    fieldKey: "type",
    fieldType: "enum",
    label: "Type",
    required: true,
    enumValues: ["asset", "liability", "equity", "revenue", "expense"],
  },
  { fieldKey: "isActive", fieldType: "bool", label: "Active" },
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
  label: "Chart of Accounts",
  columns: [
    { fieldKey: "code", renderer: "text" },
    { fieldKey: "name", renderer: "text" },
    { fieldKey: "type", renderer: "badge" },
    { fieldKey: "isActive", renderer: "bool" },
  ],
  filters: [{ fieldKey: "type" }, { fieldKey: "isActive" }],
  rowActions: [],
  queryProfile: {
    apiEndpoint: "/v1/gl/accounts",
    defaultSort: { field: "code", direction: "asc" },
  },
};

const detailFormView: FormViewDefInput = {
  viewType: "form",
  viewKey: "detail",
  version: 1,
  label: "Account Detail",
  commandSchemaRef: "CreateGLAccountCommandSchema",
  tabs: [
    {
      tabKey: "details",
      label: "Details",
      sections: [
        {
          sectionKey: "account",
          label: "Account Information",
          columns: 2,
          fields: [
            { fieldKey: "code", colSpan: 1 },
            { fieldKey: "type", colSpan: 1 },
            { fieldKey: "name", colSpan: 2 },
            { fieldKey: "isActive", colSpan: 1 },
          ],
        },
      ],
    },
  ],
  sidePanels: [],
  guards: [
    {
      permission: "gl.journal.post",
      denyMessage: "You don't have permission to manage GL accounts.",
    },
  ],
};

const actions: readonly ActionDef[] = [
  {
    actionKey: "gl.account.create",
    label: "New Account",
    route: "/gl/accounts/new",
    viewKey: "detail",
    actionType: "navigate",
    menuPath: "gl",
  },
] as const;

export const glAccount: EntityRegistration = {
  entityDef,
  fieldDefs,
  views: {
    default: defaultListView,
    detail: detailFormView,
  },
  actions,
};
