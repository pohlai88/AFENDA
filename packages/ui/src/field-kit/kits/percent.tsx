/**
 * percent field kit — tnum + % cell, Input + % suffix widget.
 */
import type { FieldKit } from "../types";

export const percentKit: FieldKit<number> = {
  CellRenderer: ({ value }) => (
    <span className="tnum tabular-nums text-right">
      {value != null ? `${value.toLocaleString(undefined, { minimumFractionDigits: 1 })}%` : "—"}
    </span>
  ),
  FormWidget: ({ value, onChange, fieldKey, label, required, readonly, error, description }) => (
    <div className="space-y-1">
      <label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={fieldKey}
          type="number"
          step="0.1"
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          readOnly={readonly}
          className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm tabular-nums text-right"
          aria-invalid={!!error}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          %
        </span>
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  ),
  filterOps: [
    { op: "gt", label: "Greater than" },
    { op: "lt", label: "Less than" },
    { op: "between", label: "Between" },
  ],
  exportAdapter: (value) => value ?? 0,
};
