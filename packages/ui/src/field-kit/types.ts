/**
 * FieldKit type definitions — the capability matrix contract.
 *
 * Each field type maps to a record of handlers:
 *   - CellRenderer: React component for table cells
 *   - FormWidget: React component for form inputs
 *   - FilterOps: available filter operations
 *   - ExportAdapter: transforms value for export
 *
 * RULES:
 *   1. This file defines the TYPES only — concrete implementations
 *      live in per-type modules.
 *   2. FieldKit is an object, not a class — functional style.
 */
import type { ComponentType } from "react";

/** Props passed to every cell renderer */
export interface CellRendererProps<T = unknown> {
  value: T;
  fieldKey: string;
  /** Full row record for context (e.g. currency for money) */
  record: Record<string, unknown>;
}

/** Props passed to every form widget */
export interface FormWidgetProps<T = unknown> {
  value: T;
  onChange: (value: T) => void;
  fieldKey: string;
  label: string;
  required?: boolean;
  readonly?: boolean;
  error?: string;
  description?: string;
  /** Extra constraints from FieldDef.validationJson */
  validation?: Record<string, unknown>;
}

/** Available filter operation for a field type */
export interface FilterOp {
  op: string;
  label: string;
}

/** Export adapter — transforms a raw value for export */
export type ExportAdapter<T = unknown> = (value: T, record: Record<string, unknown>) => string | number | boolean | null;

/** Props passed to audit-trail diff presenters */
export interface AuditPresenterProps<T = unknown> {
  oldValue: T | null;
  newValue: T | null;
  fieldKey: string;
}

/**
 * The full capability kit for a single field type.
 * One per FieldType in the registry.
 */
export interface FieldKit<T = unknown> {
  /** React component for rendering in table cells */
  CellRenderer: ComponentType<CellRendererProps<T>>;
  /** React component for form input */
  FormWidget: ComponentType<FormWidgetProps<T>>;
  /** Available filter operations */
  filterOps: readonly FilterOp[];
  /** Export value transformer */
  exportAdapter: ExportAdapter<T>;
  /** React component for rendering field diffs in audit side-panels (optional) */
  AuditPresenter?: ComponentType<AuditPresenterProps<T>>;
}
