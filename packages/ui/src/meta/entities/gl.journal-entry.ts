/**
 * gl.journal-entry — entity registration for GL journal entries.
 *
 * RULES:
 *   1. ZERO React imports — pure TS metadata.
 *   2. Imports from `@afenda/contracts` only (boundary law).
 */
import type { EntityRegistration } from "../types";
import type { EntityDef, FieldDefInput, ListViewDefInput } from "@afenda/contracts";

const entityDef: EntityDef = {
  entityKey: "gl.journal_entry",
  domainKey: "gl",
  labelSingular: "Journal Entry",
  labelPlural: "Journal Entries",
  primaryFieldKey: "entryNumber",
  recordTitleTemplate: "{entryNumber}",
};

const fieldDefs: readonly FieldDefInput[] = [
  { fieldKey: "id", fieldType: "string", label: "ID", readonly: true },
  {
    fieldKey: "entryNumber",
    fieldType: "string",
    label: "Entry #",
    readonly: true,
  },
  {
    fieldKey: "postedAt",
    fieldType: "datetime",
    label: "Posted",
    readonly: true,
  },
  { fieldKey: "memo", fieldType: "string", label: "Memo" },
  {
    fieldKey: "postedByPrincipalId",
    fieldType: "relation",
    label: "Posted By",
    readonly: true,
    relationEntityKey: "iam.principal",
  },
  {
    fieldKey: "sourceInvoiceId",
    fieldType: "relation",
    label: "Source Invoice",
    readonly: true,
    relationEntityKey: "finance.ap_invoice",
  },
  {
    fieldKey: "reversalOfId",
    fieldType: "relation",
    label: "Reversal Of",
    readonly: true,
    relationEntityKey: "gl.journal_entry",
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
];

const defaultListView: ListViewDefInput = {
  viewType: "list",
  viewKey: "default",
  version: 1,
  label: "Journal Entries",
  columns: [
    { fieldKey: "entryNumber", renderer: "text" },
    { fieldKey: "postedAt", renderer: "datetime" },
    { fieldKey: "memo", renderer: "text" },
    { fieldKey: "sourceInvoiceId", renderer: "relation" },
    { fieldKey: "reversalOfId", renderer: "relation" },
  ],
  filters: [],
  rowActions: [],
  queryProfile: {
    apiEndpoint: "/v1/gl/journal-entries",
    defaultSort: { field: "postedAt", direction: "desc" },
  },
};

export const glJournalEntry: EntityRegistration = {
  entityDef,
  fieldDefs,
  views: { default: defaultListView },
  actions: [],
};
