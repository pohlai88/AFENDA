/**
 * enum field kit — badge cell with semantic colors, Select widget.
 *
 * RULES:
 * - Use EMPTY_VALUE sentinel for empty/unselected; never raw empty string in SelectItem
 * - formatEnumLabel for human-readable display; raw value in title/aria-label
 * - Readonly renders non-interactive display, not disabled Select
 * - validation.enumValues must be runtime-validated (filter, dedupe)
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

const EMPTY_VALUE = "__empty__";

function formatEnumLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getEnumBadgeClass(value: string): string {
  switch (value.toLowerCase()) {
    case "active":
    case "approved":
    case "posted":
    case "paid":
      return "border-success/30 bg-success/10 text-success";
    case "draft":
    case "pending":
    case "in_review":
      return "border-warning/30 bg-warning/10 text-warning";
    case "inactive":
    case "rejected":
    case "void":
    case "failed":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted text-foreground";
  }
}

export const enumKit: FieldKit<string> = {
  CellRenderer: ({ value }) => {
    if (!value) return <span className="text-muted-foreground">—</span>;

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getEnumBadgeClass(
          value,
        )}`}
        title={value}
        aria-label={formatEnumLabel(value)}
      >
        {formatEnumLabel(value)}
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
    validation,
  }) => {
    const rawOptions = validation?.enumValues;
    const options = Array.from(
      new Set(
        Array.isArray(rawOptions)
          ? rawOptions.filter((v): v is string => typeof v === "string" && v.length > 0)
          : [],
      ),
    );

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
            className="flex min-h-9 w-full items-center rounded-md border bg-muted/40 px-3 text-sm"
          >
            {value ? (
              formatEnumLabel(value)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
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

        <Select
          value={value && value.length > 0 ? value : EMPTY_VALUE}
          onValueChange={(next) => onChange(next === EMPTY_VALUE ? "" : next)}
        >
          <SelectTrigger
            id={fieldKey}
            className="w-full"
            aria-invalid={!!error}
            aria-describedby={describedBy}
          >
            <SelectValue placeholder="Select…" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value={EMPTY_VALUE}>Select…</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {formatEnumLabel(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
    { op: "eq", label: "Equals" },
    { op: "ne", label: "Does not equal" },
    { op: "in", label: "In" },
    { op: "notIn", label: "Not in" },
  ],

  exportAdapter: (value) => value ?? "",
};
