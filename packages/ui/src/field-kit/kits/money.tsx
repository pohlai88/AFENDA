/**
 * money field kit — formatMoney tnum cell, amount+currency composite form widget.
 *
 * Uses the existing `formatMoney` from `@afenda/ui` for display.
 * Internal representation is bigint minor units, but widget works with
 * string input for safe bigint handling.
 */
import { formatMoney } from "../../money";
import type { FieldKit } from "../types";

/** Common currency codes for the picker */
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "MXN", "BRL"] as const;

export const moneyKit: FieldKit<bigint | string> = {
  CellRenderer: ({ value, record }) => {
    const currency = (record.currencyCode as string) ?? "USD";
    const amount = typeof value === "bigint" ? value : BigInt(value ?? 0);
    return (
      <span className="tnum tabular-nums text-right font-medium">
        {formatMoney({ amountMinor: amount, currencyCode: currency })}
      </span>
    );
  },
  FormWidget: ({ value, onChange, fieldKey, label, required, readonly, error, description, validation }) => {
    const currencyFromValidation = (validation?.currencyCode as string) ?? "";

    return (
      <div className="space-y-1">
        <label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <div className="flex items-center gap-2">
          {/* Amount input */}
          <input
            id={fieldKey}
            type="text"
            inputMode="numeric"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readonly}
            placeholder="0.00"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums text-right"
            aria-invalid={!!error}
            aria-describedby={description ? `${fieldKey}-desc` : undefined}
          />
          {/* Currency picker */}
          <select
            id={`${fieldKey}-currency`}
            value={currencyFromValidation}
            disabled={readonly || !!currencyFromValidation}
            onChange={() => {
              /* Currency is typically on the record, not the field value.
                 When editable, consumers handle this via the record's currencyCode field. */
            }}
            className="w-20 rounded-md border border-input bg-background px-2 py-2 text-sm"
            aria-label="Currency"
          >
            {currencyFromValidation ? (
              <option value={currencyFromValidation}>{currencyFromValidation}</option>
            ) : (
              <>
                <option value="">—</option>
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </>
            )}
          </select>
        </div>
        {description && <p id={`${fieldKey}-desc`} className="text-xs text-muted-foreground">{description}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
  filterOps: [
    { op: "gt", label: "Greater than" },
    { op: "lt", label: "Less than" },
    { op: "between", label: "Between" },
  ],
  exportAdapter: (value) => {
    const minor = typeof value === "bigint" ? value : BigInt(value ?? 0);
    // Export as major units (cents → dollars)
    return Number(minor) / 100;
  },
};
