/**
 * bool field kit — check/x icon cell, toggle Switch widget.
 */
import type { FieldKit } from "../types";

export const boolKit: FieldKit<boolean> = {
  CellRenderer: ({ value }) => (
    <span className={value ? "text-success" : "text-muted-foreground"}>
      {value ? "✓" : "✗"}
    </span>
  ),
  FormWidget: ({ value, onChange, fieldKey, label, readonly, error, description }) => {
    const checked = value ?? false;
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {/* Toggle switch */}
          <button
            type="button"
            role="switch"
            id={fieldKey}
            aria-checked={checked}
            aria-invalid={!!error}
            disabled={readonly}
            onClick={() => onChange(!checked)}
            className={[
              "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              checked ? "bg-primary" : "bg-input",
              readonly ? "cursor-not-allowed opacity-50" : "",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={[
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                checked ? "translate-x-4" : "translate-x-0",
              ].join(" ")}
            />
          </button>
          <label
            htmlFor={fieldKey}
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            {label}
          </label>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
  filterOps: [{ op: "eq", label: "Equals" }],
  exportAdapter: (value) => (value ? "true" : "false"),
};
