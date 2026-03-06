/**
 * decimal field kit — locale-formatted tnum cell, masked Input widget.
 */
import type { FieldKit } from "../types";

export const decimalKit: FieldKit<number> = {
  CellRenderer: ({ value }) => (
    <span className="tnum tabular-nums text-right">
      {value != null ? value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
    </span>
  ),
  FormWidget: ({ value, onChange, fieldKey, label, required, readonly, error, description }) => (
    <div className="space-y-1">
      <label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        id={fieldKey}
        type="number"
        step="0.01"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        readOnly={readonly}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums text-right"
        aria-invalid={!!error}
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  ),
  filterOps: [
    { op: "eq", label: "Equals" },
    { op: "gt", label: "Greater than" },
    { op: "lt", label: "Less than" },
    { op: "between", label: "Between" },
  ],
  exportAdapter: (value) => value ?? 0,
};
