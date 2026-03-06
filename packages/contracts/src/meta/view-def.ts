/**
 * ViewDef — metadata describing how an entity is rendered.
 *
 * Discriminated union on `viewType`: `"list"`, `"form"`, `"kanban"`, etc.
 *
 * RULES:
 *   1. Transport shape only — no React, no Tailwind, no icon imports.
 *   2. `renderer` values are semantic string enums (`"money"`, `"badge"`,
 *      `"date"`, `"text"`, `"relation"`) — never component names or CSS.
 *      The field-kit maps these to React components at runtime.
 *   3. Each view has a `version` (integer, monotonic). Overlays that declare
 *      `requiresBaseVersion` are rejected if the base version has changed.
 *   4. `commandSchemaRef` on form views is a string key that the consumer
 *      maps to the actual Zod command schema. Forms never derive validation
 *      from FieldDefs — they delegate to the existing contracts command schema.
 *   5. `queryProfile` on list views links to existing typed API endpoints —
 *      no generic "query-anything" endpoint.
 */
import { z } from "zod";

// ── Renderers ─────────────────────────────────────────────────────────────────

/**
 * Semantic renderer keys — field-kit maps these to React components.
 * Contracts never references React, shadcn, or Tailwind.
 */
export const RendererTypeValues = [
  "text",
  "money",
  "badge",
  "date",
  "datetime",
  "number",
  "percent",
  "relation",
  "bool",
  "document",
  "code",
] as const;

export const RendererTypeSchema = z.enum(RendererTypeValues);
export type RendererType = z.infer<typeof RendererTypeSchema>;

// ── Column ────────────────────────────────────────────────────────────────────

export const ColumnDefSchema = z.object({
  fieldKey: z.string().min(1).max(128),
  renderer: RendererTypeSchema,
  width: z.number().int().positive().optional(),
  pin: z.enum(["left", "right"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  format: z.string().max(64).optional(),
});

export type ColumnDef = z.infer<typeof ColumnDefSchema>;

// ── Filter ────────────────────────────────────────────────────────────────────

export const FilterDefSchema = z.object({
  fieldKey: z.string().min(1).max(128),
  defaultValue: z.unknown().optional(),
});

export type FilterDef = z.infer<typeof FilterDefSchema>;

// ── Row action ────────────────────────────────────────────────────────────────

export const RowActionDefSchema = z.object({
  actionKey: z.string().min(1).max(128),
  label: z.string().min(1).max(64),
  variant: z.enum(["default", "destructive", "outline"]).default("default"),
  /** Confirmation dialog required before executing */
  confirm: z.boolean().default(false),
});

export type RowActionDef = z.infer<typeof RowActionDefSchema>;

/** Input type — `variant` and `confirm` are optional (have defaults). */
export type RowActionDefInput = z.input<typeof RowActionDefSchema>;

// ── Query Profile ─────────────────────────────────────────────────────────────

export const QueryProfileSchema = z.object({
  /** Existing API route path: `"/v1/invoices"` */
  apiEndpoint: z.string().min(1).max(256),
  /** Fields to select from the API response */
  selectFields: z.array(z.string().min(1).max(128)).optional(),
  /** Default sort: `{ field: "createdAt", direction: "desc" }` */
  defaultSort: z
    .object({
      field: z.string().min(1).max(128),
      direction: z.enum(["asc", "desc"]),
    })
    .optional(),
});

export type QueryProfile = z.infer<typeof QueryProfileSchema>;

// ── Form field ref ────────────────────────────────────────────────────────────

export const FormFieldRefSchema = z.object({
  fieldKey: z.string().min(1).max(128),
  /** Column span in a grid layout (1–4) */
  colSpan: z.number().int().min(1).max(4).default(1),
});

export type FormFieldRef = z.infer<typeof FormFieldRefSchema>;

// ── Form section ──────────────────────────────────────────────────────────────

export const FormSectionDefSchema = z.object({
  sectionKey: z.string().min(1).max(128),
  label: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  /** Grid columns for this section (default: 2) */
  columns: z.number().int().min(1).max(4).default(2),
  fields: z.array(FormFieldRefSchema),
});

export type FormSectionDef = z.infer<typeof FormSectionDefSchema>;

// ── Form tab ──────────────────────────────────────────────────────────────────

export const FormTabDefSchema = z.object({
  tabKey: z.string().min(1).max(128),
  label: z.string().min(1).max(64),
  sections: z.array(FormSectionDefSchema),
});

export type FormTabDef = z.infer<typeof FormTabDefSchema>;

// ── Side panel ────────────────────────────────────────────────────────────────

export const SidePanelDefSchema = z.object({
  panelKey: z.string().min(1).max(128),
  label: z.string().min(1).max(64),
  /** Semantic panel type — determines content */
  panelType: z.enum(["evidence", "audit", "timeline", "custom"]),
});

export type SidePanelDef = z.infer<typeof SidePanelDefSchema>;

// ── Guards (form-level) ───────────────────────────────────────────────────────

export const FormGuardDefSchema = z.object({
  /** Permission key required to access the form */
  permission: z.string().min(1).max(128),
  /** Fallback message when guard blocks access */
  denyMessage: z.string().max(256).optional(),
});

export type FormGuardDef = z.infer<typeof FormGuardDefSchema>;

// ── List view ─────────────────────────────────────────────────────────────────

export const ListViewDefSchema = z.object({
  viewType: z.literal("list"),
  viewKey: z.string().min(1).max(128),
  version: z.number().int().nonnegative(),
  label: z.string().min(1).max(128),
  columns: z.array(ColumnDefSchema),
  filters: z.array(FilterDefSchema).default([]),
  rowActions: z.array(RowActionDefSchema).default([]),
  queryProfile: QueryProfileSchema,
});

export type ListViewDef = z.infer<typeof ListViewDefSchema>;

/** Input type — `filters`, `rowActions` are optional (have defaults). */
export type ListViewDefInput = z.input<typeof ListViewDefSchema>;

// ── Form view ─────────────────────────────────────────────────────────────────

export const FormViewDefSchema = z.object({
  viewType: z.literal("form"),
  viewKey: z.string().min(1).max(128),
  version: z.number().int().nonnegative(),
  label: z.string().min(1).max(128),
  tabs: z.array(FormTabDefSchema),
  sidePanels: z.array(SidePanelDefSchema).default([]),
  guards: z.array(FormGuardDefSchema).default([]),
  /**
   * String key that the consumer maps to the actual Zod command schema.
   * Forms never derive validation from FieldDefs.
   */
  commandSchemaRef: z.string().min(1).max(128),
});

export type FormViewDef = z.infer<typeof FormViewDefSchema>;

/** Input type — `sidePanels`, `guards` are optional (have defaults). */
export type FormViewDefInput = z.input<typeof FormViewDefSchema>;

// ── Stub views (Phase 2+) ────────────────────────────────────────────────────

export const KanbanViewDefSchema = z.object({
  viewType: z.literal("kanban"),
  viewKey: z.string().min(1).max(128),
  version: z.number().int().nonnegative(),
  label: z.string().min(1).max(128),
  /** Field whose enum values define the columns */
  groupByField: z.string().min(1).max(128),
});

export type KanbanViewDef = z.infer<typeof KanbanViewDefSchema>;

export const PivotViewDefSchema = z.object({
  viewType: z.literal("pivot"),
  viewKey: z.string().min(1).max(128),
  version: z.number().int().nonnegative(),
  label: z.string().min(1).max(128),
  /** Row grouping field */
  rowField: z.string().min(1).max(128),
  /** Column grouping field */
  colField: z.string().min(1).max(128),
  /** Value field for aggregation */
  valueField: z.string().min(1).max(128),
  /** Aggregation function */
  aggregate: z.enum(["sum", "count", "avg", "min", "max"]).default("sum"),
});

export type PivotViewDef = z.infer<typeof PivotViewDefSchema>;

/** Input type — `aggregate` is optional (has default). */
export type PivotViewDefInput = z.input<typeof PivotViewDefSchema>;

export const CalendarViewDefSchema = z.object({
  viewType: z.literal("calendar"),
  viewKey: z.string().min(1).max(128),
  version: z.number().int().nonnegative(),
  label: z.string().min(1).max(128),
  /** Date field used for calendar placement */
  dateField: z.string().min(1).max(128),
  /** Optional end date for range display */
  endDateField: z.string().min(1).max(128).optional(),
  /** Field shown as the event title */
  titleField: z.string().min(1).max(128),
});

export type CalendarViewDef = z.infer<typeof CalendarViewDefSchema>;

/** Input type for CalendarViewDef. */
export type CalendarViewDefInput = z.input<typeof CalendarViewDefSchema>;

// ── Union ─────────────────────────────────────────────────────────────────────

export const ViewDefSchema = z.discriminatedUnion("viewType", [
  ListViewDefSchema,
  FormViewDefSchema,
  KanbanViewDefSchema,
  PivotViewDefSchema,
  CalendarViewDefSchema,
]);

export type ViewDef = z.infer<typeof ViewDefSchema>;

/** Input type — cascades input types through the discriminated union. */
export type ViewDefInput = z.input<typeof ViewDefSchema>;
