/**
 * date field kit — locale short date cell, date input widget.
 */
import type { FieldKit } from "../types";

export const dateKit: FieldKit<string> = {
  CellRenderer: ({ value }) => {
    if (!value) return <span className="text-muted-foreground">—</span>;
    const formatted = new Date(value + "T00:00:00Z").toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return <span>{formatted}</span>;
  },
  FormWidget: ({ value, onChange, fieldKey, label, required, readonly, error, description }) => (
    <div className="space-y-1">
      <label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        id={fieldKey}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readonly}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        aria-invalid={!!error}
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  ),
  filterOps: [
    { op: "eq", label: "Equals" },
    { op: "before", label: "Before" },
    { op: "after", label: "After" },
    { op: "between", label: "Between" },
  ],
  exportAdapter: (value) => value ?? "",
};
