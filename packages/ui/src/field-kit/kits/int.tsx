/**
 * int field kit — right-aligned integer cell, number Input widget.
 * Handles empty state explicitly; never coerces blank to 0.
 */
import type { FieldKit } from "../types";
import { Input } from "../../components/input";
import { Label } from "../../components/label";

function formatInteger(value: number): string {
  return value.toLocaleString();
}

export const intKit: FieldKit<number> = {
  CellRenderer: ({ value }) => (
    <span className="block text-right tabular-nums">
      {typeof value === "number" ? formatInteger(value) : "—"}
    </span>
  ),

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
    const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

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
            className="flex min-h-9 w-full items-center justify-end rounded-md border bg-muted/40 px-3 text-sm tabular-nums"
          >
            {typeof value === "number" ? (
              formatInteger(value)
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
        <Input
          id={fieldKey}
          type="number"
          inputMode="numeric"
          step={1}
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value;

            if (raw === "") {
              onChange(null);
              return;
            }

            const parsed = Number(raw);
            if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
              return;
            }

            onChange(parsed);
          }}
          className="w-full tabular-nums text-right"
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
    { op: "eq", label: "Equals" },
    { op: "ne", label: "Does not equal" },
    { op: "gt", label: "Greater than" },
    { op: "gte", label: "Greater than or equal" },
    { op: "lt", label: "Less than" },
    { op: "lte", label: "Less than or equal" },
    { op: "between", label: "Between" },
  ],

  exportAdapter: (value) => value ?? "",
};
