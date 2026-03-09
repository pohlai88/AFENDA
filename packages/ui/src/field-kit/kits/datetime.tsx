/**
 * datetime field kit — UTC instant field, locale display, local datetime input widget.
 *
 * RULES:
 * - Canonical value is always a full UTC ISO string with Z suffix
 * - `datetime-local` is only a local UI representation
 * - Always convert UTC -> local input value and local input value -> UTC
 * - Never append/remove "Z" by string surgery alone
 */
import { format } from "date-fns";
import type { FieldKit } from "../types";
import { Input } from "../../components/input";
import { Label } from "../../components/label";

function parseUtcDateTime(value?: string | null): Date | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return date;
}

/**
 * Convert canonical UTC ISO string into local datetime-local input value:
 *   2026-03-07T09:30:00.000Z -> 2026-03-07T16:30   (example in UTC+7)
 */
function toDateTimeLocalValue(value?: string | null): string {
  const date = parseUtcDateTime(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert local datetime-local input value into canonical UTC ISO string:
 *   2026-03-07T16:30 (local) -> 2026-03-07T09:30:00.000Z   (example in UTC+7)
 */
function fromDateTimeLocalValue(value: string): string {
  if (!value) return "";

  const localDate = new Date(value);
  if (Number.isNaN(localDate.getTime())) return "";

  return localDate.toISOString();
}

function formatUtcDateTime(value?: string | null, pattern = "PPp"): string {
  const date = parseUtcDateTime(value);
  return date ? format(date, pattern) : "—";
}

export const datetimeKit: FieldKit<string> = {
  CellRenderer: ({ value }) => {
    if (!value) {
      return <span className="text-muted-foreground">—</span>;
    }

    return <span>{formatUtcDateTime(value, "PPp")}</span>;
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
    if (readonly) {
      return (
        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
            {formatUtcDateTime(value)}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
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
          type="datetime-local"
          value={toDateTimeLocalValue(value)}
          onChange={(e) => onChange(fromDateTimeLocalValue(e.target.value))}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${fieldKey}-error`
              : description
                ? `${fieldKey}-description`
                : undefined
          }
        />

        {description && !error && (
          <p id={`${fieldKey}-description`} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}

        {error && (
          <p id={`${fieldKey}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },

  filterOps: [
    { op: "before", label: "Before" },
    { op: "after", label: "After" },
    { op: "between", label: "Between" },
  ],

  exportAdapter: (value) => value ?? "",
};
