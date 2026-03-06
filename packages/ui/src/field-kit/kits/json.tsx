/**
 * json field kit — code block cell, Textarea widget.
 */
import type { FieldKit } from "../types";

export const jsonKit: FieldKit<unknown> = {
  CellRenderer: ({ value }) => {
    if (value == null) return <span className="text-muted-foreground">—</span>;
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    const truncated = text.length > 60 ? text.slice(0, 57) + "…" : text;
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono" title={text}>
        {truncated}
      </code>
    );
  },
  FormWidget: ({ value, onChange, fieldKey, label, required, readonly, error, description }) => {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return (
      <div className="space-y-1">
        <label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <textarea
          id={fieldKey}
          value={text ?? ""}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          readOnly={readonly}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          aria-invalid={!!error}
        />
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
  filterOps: [],
  exportAdapter: (value) => (value != null ? JSON.stringify(value) : ""),
};
