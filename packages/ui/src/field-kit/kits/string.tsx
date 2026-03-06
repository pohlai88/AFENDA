/**
 * string field kit — text truncation cell, Input widget, text filter ops.
 */
import type { FieldKit } from "../types";

export const stringKit: FieldKit<string> = {
  CellRenderer: ({ value }) => {
    const text = value ?? "";
    const truncated = text.length > 80 ? text.slice(0, 77) + "…" : text;
    return <span title={text}>{truncated}</span>;
  },
  FormWidget: ({ value, onChange, fieldKey, label, required, readonly, error, description }) => (
    <div className="space-y-1">
      <label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        id={fieldKey}
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readonly}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        aria-describedby={description ? `${fieldKey}-desc` : undefined}
        aria-invalid={!!error}
      />
      {description && (
        <p id={`${fieldKey}-desc`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  ),
  filterOps: [
    { op: "contains", label: "Contains" },
    { op: "eq", label: "Equals" },
    { op: "startsWith", label: "Starts with" },
  ],
  exportAdapter: (value) => value ?? "",
};
