/**
 * comm.workflow — entity registration for COMM workflow automation.
 */
import type { EntityRegistration } from "../types";
import type { ActionDef, EntityDef, FieldDefInput, ListViewDefInput } from "@afenda/contracts";

const entityDef: EntityDef = {
  entityKey: "comm.workflow",
  domainKey: "comm",
  labelSingular: "Workflow",
  labelPlural: "Workflows",
  primaryFieldKey: "name",
  recordTitleTemplate: "{name}",
};

const fieldDefs: readonly FieldDefInput[] = [
  { fieldKey: "id", fieldType: "string", label: "ID", readonly: true },
  { fieldKey: "name", fieldType: "string", label: "Name", required: true },
  {
    fieldKey: "status",
    fieldType: "enum",
    label: "Status",
    enumValues: ["draft", "active", "paused", "archived"],
  },
  { fieldKey: "triggerType", fieldType: "string", label: "Trigger", readonly: true },
  { fieldKey: "actionsCount", fieldType: "int", label: "Actions", readonly: true },
  { fieldKey: "runCount", fieldType: "int", label: "Runs", readonly: true },
  {
    fieldKey: "lastTriggeredAt",
    fieldType: "datetime",
    label: "Last Triggered",
    readonly: true,
  },
  { fieldKey: "updatedAt", fieldType: "datetime", label: "Updated", readonly: true },
  { fieldKey: "createdAt", fieldType: "datetime", label: "Created", readonly: true },
];

const defaultListView: ListViewDefInput = {
  viewType: "list",
  viewKey: "default",
  version: 1,
  label: "Workflows",
  columns: [
    { fieldKey: "name", renderer: "text" },
    { fieldKey: "triggerType", renderer: "text" },
    { fieldKey: "status", renderer: "badge" },
    { fieldKey: "actionsCount", renderer: "text", align: "right" },
    { fieldKey: "runCount", renderer: "text", align: "right" },
    { fieldKey: "lastTriggeredAt", renderer: "datetime" },
  ],
  filters: [{ fieldKey: "status" }],
  rowActions: [{ actionKey: "workflow.view", label: "Open" }],
  queryProfile: {
    apiEndpoint: "/v1/workflows",
    defaultSort: { field: "updatedAt", direction: "desc" },
  },
};

const actions: readonly ActionDef[] = [
  {
    actionKey: "workflow.view",
    label: "Open",
    actionType: "inline",
  },
];

export const commWorkflow: EntityRegistration = {
  entityDef,
  fieldDefs,
  views: { default: defaultListView },
  actions,
};
