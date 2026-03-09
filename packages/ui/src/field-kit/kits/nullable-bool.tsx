/**
 * nullableBool field kit — tri-state yes/no/unknown renderer and form widget.
 *
 * RULES:
 * - Use for nullable boolean fields only.
 * - Non-nullable booleans should use `boolKit`.
 * - Null means "unset / unknown / not specified", not false.
 * - Export uses business-readable values for CSV/Excel.
 */
import type { FieldKit } from "../types";
import { Label } from "../../components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/select";

type NullableBool = boolean | null;

function nullableBoolText(value: NullableBool | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not set";
}

function nullableBoolSelectValue(
  value: NullableBool | undefined,
): "true" | "false" | "null" {
  if (value === true) return "true";
  if (value === false) return "false";
  return "null";
}

function parseNullableBoolSelectValue(value: string): NullableBool {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export const nullableBoolKit: FieldKit<NullableBool> = {
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
    const descriptionId = description ? `${fieldKey}-description` : undefined;
    const errorId = error ? `${fieldKey}-error` : undefined;
    const ariaDescribedBy =
      [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="space-y-1">
        <Label
          htmlFor={fieldKey}
          className={readonly ? "opacity-70" : undefined}
        >
          {label}
        </Label>

        <Select
          value={nullableBoolSelectValue(value)}
          onValueChange={(next) => onChange(parseNullableBoolSelectValue(next))}
          disabled={readonly}
        >
          <SelectTrigger
            id={fieldKey}
            aria-invalid={error ? true : undefined}
            aria-describedby={ariaDescribedBy}
          >
            <SelectValue placeholder="Select value">
              {nullableBoolText(value)}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
            <SelectItem value="null">Not set</SelectItem>
          </SelectContent>
        </Select>

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

  filterOps: [
    { op: "eq", label: "Equals" },
    { op: "isEmpty", label: "Is empty" },
    { op: "isNotEmpty", label: "Is not empty" },
  ],

  exportAdapter: (value) => {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "Not set";
  },

  AuditPresenter: ({ oldValue, newValue }) => {
    const oldText = nullableBoolText(oldValue);
    const newText = nullableBoolText(newValue);

    return (
      <span>
        {oldText} → {newText}
      </span>
    );
  },
};
