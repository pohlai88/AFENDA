import type { ComponentType } from "react";

export type RowRecord = Record<string, unknown>;
export type ExportScalar = string | number | boolean | null;

export type FilterOperator =
  | "eq"
  | "ne"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "before"
  | "after"
  | "between"
  | "in"
  | "notIn"
  | "isEmpty"
  | "isNotEmpty";

/** Props passed to every cell renderer */
export interface CellRendererProps<
  T = unknown,
  TRecord extends RowRecord = RowRecord,
> {
  value: T | null | undefined;
  fieldKey: string;
  /** Full row record for context (e.g. currency for money) */
  record: TRecord;
  /** Extra constraints from FieldDef.validationJson (e.g. options for relation/enum) */
  validation?: Record<string, unknown>;
}

/** Props passed to every form widget */
export interface FormWidgetProps<
  T = unknown,
  TRecord extends RowRecord = RowRecord,
> {
  value: T | null | undefined;
  onChange: (value: T | null) => void;
  onBlur?: () => void;
  fieldKey: string;
  label: string;
  record?: TRecord;
  required?: boolean;
  readonly?: boolean;
  error?: string;
  description?: string;
  /** Extra constraints from FieldDef.validationJson */
  validation?: Record<string, unknown>;
  /** Extra UI hints from registry metadata */
  ui?: Record<string, unknown>;
}

/** Available filter operation for a field type */
export interface FilterOp {
  op: FilterOperator;
  label: string;
}

/** Export adapter — transforms a raw value for export */
export type ExportAdapter<
  T = unknown,
  TRecord extends RowRecord = RowRecord,
> = (value: T | null | undefined, record: TRecord) => ExportScalar;

/** Props passed to audit-trail diff presenters */
export interface AuditPresenterProps<
  T = unknown,
  TRecord extends RowRecord = RowRecord,
> {
  oldValue: T | null | undefined;
  newValue: T | null | undefined;
  fieldKey: string;
  record?: TRecord;
}

/**
 * The full capability kit for a single field type.
 * One per FieldType in the registry.
 */
export interface FieldKit<
  T = unknown,
  TRecord extends RowRecord = RowRecord,
> {
  /** React component for rendering in table cells */
  CellRenderer: ComponentType<CellRendererProps<T, TRecord>>;
  /** React component for form input */
  FormWidget: ComponentType<FormWidgetProps<T, TRecord>>;
  /** Available filter operations */
  filterOps: readonly FilterOp[];
  /** Export value transformer */
  exportAdapter: ExportAdapter<T, TRecord>;
  /** React component for rendering field diffs in audit side-panels (optional) */
  AuditPresenter?: ComponentType<AuditPresenterProps<T, TRecord>>;
}
