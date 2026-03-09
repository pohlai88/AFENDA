/**
 * decimal field kit — generic decimal number field (non-money).
 *
 * RULES:
 * - Use for generic decimal values, not currency-safe money amounts
 * - Empty value must remain empty; never coerce "" to 0
 * - JS number is the canonical value here, so precision-sensitive finance fields
 *   should use a dedicated money/decimal-string kit instead
 */
import type { FieldKit } from "../types";
import { Input } from "../../components/input";
import { Label } from "../../components/label";

function formatDecimal(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseDecimalInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;

  return parsed;
}

export const decimalKit: FieldKit<number> = {
  CellRenderer: ({ value }) => (
    <span className="tnum tabular-nums text-right">
      {formatDecimal(value)}
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
    if (readonly) {
      return (
        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm tabular-nums text-right">
            {formatDecimal(value)}
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
          type="number"
          inputMode="decimal"
          step="0.01"
          value={value ?? ""}
          onChange={(e) => {
            const next = parseDecimalInput(e.target.value);
            onChange(next ?? null);
          }}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${fieldKey}-error`
              : description
                ? `${fieldKey}-description`
                : undefined
          }
          className="tabular-nums text-right"
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
    { op: "eq", label: "Equals" },
    { op: "gt", label: "Greater than" },
    { op: "lt", label: "Less than" },
    { op: "between", label: "Between" },
  ],

  exportAdapter: (value) => value ?? "",
};
