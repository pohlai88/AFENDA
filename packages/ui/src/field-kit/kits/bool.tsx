/**
 * bool field kit — semantic yes/no cell renderer, accessible switch form widget.
 *
 * RULES:
 * - Use only for non-nullable boolean fields.
 * - Nullable booleans should use a dedicated nullableBoolKit.
 * - Export uses business-readable values for CSV/Excel.
 */
import type { FieldKit } from "../types";
import { Switch } from "../../components/switch";
import { Label } from "../../components/label";

export const boolKit: FieldKit<boolean> = {
  CellRenderer: ({ value }) => {
    if (value == null) {
      return (
        <span
          className="text-muted-foreground"
          aria-label="Not set"
          title="Not set"
        >
          —
        </span>
      );
    }

    const text = value ? "Yes" : "No";

    return (
      <span
        className={value ? "text-success" : "text-muted-foreground"}
        aria-label={text}
        title={text}
      >
        {value ? "✓" : "✗"}
      </span>
    );
  },

  FormWidget: ({
    value,
    onChange,
    fieldKey,
    label,
    readonly,
    error,
    description,
  }) => {
    const checked = Boolean(value);
    const descriptionId = description ? `${fieldKey}-description` : undefined;
    const errorId = error ? `${fieldKey}-error` : undefined;
    const ariaDescribedBy =
      [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Switch
            id={fieldKey}
            checked={checked}
            onCheckedChange={(nextChecked) => onChange(Boolean(nextChecked))}
            disabled={readonly}
            aria-invalid={error ? true : undefined}
            aria-describedby={ariaDescribedBy}
          />
          <Label
            htmlFor={fieldKey}
            className={readonly ? "opacity-70" : "cursor-pointer"}
          >
            {label}
          </Label>
        </div>

        {description ? (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}

        {error ? (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  },

  filterOps: [{ op: "eq", label: "Equals" }],

  exportAdapter: (value) => (value ? "Yes" : "No"),

  AuditPresenter: ({ oldValue, newValue }) => {
    const oldText =
      oldValue === true ? "Yes" : oldValue === false ? "No" : "Not set";
    const newText =
      newValue === true ? "Yes" : newValue === false ? "No" : "Not set";

    return (
      <span>
        {oldText} → {newText}
      </span>
    );
  },
};
