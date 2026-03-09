/**
 * string field kit — truncated text cell, editable Input widget, text filters.
 *
 * RULES:
 * - Readonly renders non-interactive display, not a readOnly input
 * - Preserves raw user input; no trimming/coercion in the field kit
 * - aria-describedby links description and error
 * - Nullish values remain visually empty, not silently coerced to meaningful data
 */
import type { FieldKit } from "../types";
import { Input } from "../../components/input";
import { Label } from "../../components/label";

function renderDisplayValue(value: string | null | undefined) {
  return value != null && value !== "" ? (
    value
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

export const stringKit: FieldKit<string | undefined> = {
  CellRenderer: ({ value }) => {
    if (value == null || value === "") {
      return <span className="text-muted-foreground">—</span>;
    }

    const text = String(value);
    const truncated = text.length > 80 ? `${text.slice(0, 77)}…` : text;

    return (
      <span title={text} className="block max-w-full truncate">
        {truncated}
      </span>
    );
  },

  FormWidget: ({
    value,
    onChange,
    fieldKey,
    label,
    required,
    readonly,
    error,
    description,
  }) => {
    const descriptionId = description ? `${fieldKey}-description` : undefined;
    const errorId = error ? `${fieldKey}-error` : undefined;
    const describedBy =
      [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

    if (readonly) {
      return (
        <div className="space-y-1">
          <Label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>

          <div
            id={fieldKey}
            aria-describedby={describedBy}
            className="flex min-h-9 w-full items-center rounded-md border bg-muted/40 px-3 text-sm break-words"
          >
            {renderDisplayValue(value)}
          </div>

          {description && (
            <p id={descriptionId} className="text-xs text-muted-foreground">
              {description}
            </p>
          )}

          {error && (
            <p id={errorId} className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <Label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>

        <Input
          id={fieldKey}
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          aria-invalid={!!error}
          aria-describedby={describedBy}
        />

        {description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}

        {error && (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },

  filterOps: [
    { op: "contains", label: "Contains" },
    { op: "eq", label: "Equals" },
    { op: "startsWith", label: "Starts with" },
  ],

  exportAdapter: (value) => value ?? null,
};
