/**
 * int field kit — right-aligned tnum cell, number Input widget.
 */
import type { FieldKit } from "../types";

export const intKit: FieldKit<number> = {
  CellRenderer: ({ value }) => (
    <span className="tnum text-right tabular-nums">{value?.toLocaleString() ?? "—"}</span>
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
