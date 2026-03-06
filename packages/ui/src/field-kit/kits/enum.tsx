/**
 * enum field kit — Badge cell, Select widget.
 *
 * Status colors use DS tokens via inline style.
 */
import type { FieldKit } from "../types";

export const enumKit: FieldKit<string> = {
  CellRenderer: ({ value }) => {
    if (!value) return <span className="text-muted-foreground">—</span>;
    return (
      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
        {value}
      </span>
    );
  },
  FormWidget: ({ value, onChange, fieldKey, label, required, readonly, error, description, validation }) => {
    const options = (validation?.enumValues as string[]) ?? [];
    return (
      <div className="space-y-1">
        <label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <select
          id={fieldKey}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={readonly}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          aria-invalid={!!error}
        >
          <option value="">Select…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
  filterOps: [
    { op: "eq", label: "Equals" },
    { op: "in", label: "In" },
  ],
  exportAdapter: (value) => value ?? "",
};
