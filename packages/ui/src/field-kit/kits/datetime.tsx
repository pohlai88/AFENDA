/**
 * datetime field kit — locale date+time cell, datetime input widget.
 */
import type { FieldKit } from "../types";

export const datetimeKit: FieldKit<string> = {
  CellRenderer: ({ value }) => {
    if (!value) return <span className="text-muted-foreground">—</span>;
    const formatted = new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
        type="datetime-local"
        value={value ? value.replace("Z", "").slice(0, 16) : ""}
        onChange={(e) => onChange(e.target.value ? e.target.value + ":00.000Z" : "")}
        readOnly={readonly}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        aria-invalid={!!error}
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  ),
  filterOps: [
    { op: "before", label: "Before" },
    { op: "after", label: "After" },
    { op: "between", label: "Between" },
  ],
  exportAdapter: (value) => value ?? "",
};
