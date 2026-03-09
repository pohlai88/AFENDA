/**
 * money field kit — amount-only, currency from record.
 *
 * Honest model: this field edits amount only. Currency comes from record.currencyCode.
 * Never calls BigInt() on raw decimal input. Uses currency exponent for parse/format.
 * Export returns string (never Number) to avoid precision loss.
 */
import {
  formatMoney,
  getCurrencyExponent,
  minorToMajorDecimalString,
  parseMajorToMinor,
} from "../../money";
import type { FieldKit } from "../types";
import { Input } from "../../components/input";
import { Label } from "../../components/label";

export const moneyKit: FieldKit<bigint | string> = {
  CellRenderer: ({ value, record }) => {
    const currency =
      typeof record.currencyCode === "string" ? record.currencyCode : null;
    if (!currency) {
      return <span className="text-muted-foreground">—</span>;
    }

    try {
      const amount =
        typeof value === "bigint"
          ? value
          : typeof value === "string" && value.trim() !== ""
            ? parseMajorToMinor(value, currency)
            : null;

      if (amount == null) {
        return <span className="text-muted-foreground">—</span>;
      }

      return (
        <span className="block text-right font-medium tabular-nums">
          {formatMoney({ amountMinor: amount, currencyCode: currency })}
        </span>
      );
    } catch {
      return <span className="text-destructive">Invalid</span>;
    }
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
    record,
  }) => {
    const currency =
      typeof record?.currencyCode === "string" ? record.currencyCode : "";
    const exponent = currency ? getCurrencyExponent(currency) : 2;

    const displayValue =
      typeof value === "bigint"
        ? currency
          ? minorToMajorDecimalString(value, currency)
          : "—"
        : typeof value === "string"
          ? value
          : "";

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
            className="flex min-h-9 items-center justify-between rounded-md border bg-muted/40 px-3 text-sm"
          >
            <span className="text-muted-foreground">{currency || "—"}</span>
            <span className="tabular-nums">
              {typeof value === "bigint" && currency
                ? formatMoney({ amountMinor: value, currencyCode: currency })
                : displayValue || "—"}
            </span>
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

        <div
          role="group"
          aria-labelledby={fieldKey}
          aria-describedby={describedBy}
          className="flex items-center gap-2"
        >
          <Input
            id={fieldKey}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={(e) => {
              const raw = e.target.value;
              onChange(raw === "" ? (null as bigint | string | null) : raw);
            }}
            placeholder={
              exponent === 0 ? "0" : `0.${"0".repeat(exponent)}`
            }
            className="flex-1 text-right tabular-nums"
            aria-invalid={!!error}
            aria-describedby={describedBy}
          />
          <div className="flex h-9 min-w-20 items-center justify-center rounded-md border bg-muted px-3 text-sm">
            {currency || "—"}
          </div>
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

  exportAdapter: (value, record) => {
    const currency =
      typeof record?.currencyCode === "string" ? record.currencyCode : null;
    if (!currency) return "";

    try {
      const amountMinor =
        typeof value === "bigint"
          ? value
          : typeof value === "string" && value.trim() !== ""
            ? parseMajorToMinor(value, currency)
            : null;

      if (amountMinor == null) return "";
      return minorToMajorDecimalString(amountMinor, currency);
    } catch {
      return "";
    }
  },
};
