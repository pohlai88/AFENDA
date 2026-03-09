"use client";

/**
 * percent field kit — tabular numeric percent display + controlled percent input.
 *
 * CANONICAL VALUE:
 * - Stored value is "whole percent".
 * - Example: 12.5 means 12.5%, not 0.125.
 *
 * RULES:
 * - Blank input => null (never coerce to 0)
 * - Invalid numeric input => null
 * - No silent coercion of blank to 0
 * - Export preserves nullability
 */
import { useMemo } from "react";
import type { FieldKit } from "../types";
import { Input } from "../../components/input";
import { Label } from "../../components/label";

function formatPercentDisplay(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

function toInputString(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return String(value);
}

function parsePercentInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;

  return parsed;
}

export const percentKit: FieldKit<number> = {
  CellRenderer: ({ value }) => (
    <span
      className="tnum tabular-nums text-right"
      aria-label={value != null ? `${value} percent` : "No percentage"}
      title={value != null ? `${value}%` : undefined}
    >
      {formatPercentDisplay(value, 1)}
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
    const inputValue = useMemo(() => toInputString(value), [value]);
    const descriptionId = description ? `${fieldKey}-description` : undefined;
    const errorId = error ? `${fieldKey}-error` : undefined;
    const describedBy =
      [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

    if (readonly) {
      return (
        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <div
            id={fieldKey}
            aria-describedby={describedBy}
            className="flex min-h-9 w-full items-center justify-end rounded-md border bg-muted/50 px-3 py-2 pr-8 text-sm tabular-nums text-right"
          >
            {formatPercentDisplay(value, 1)}
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

        <div className="relative">
          <Input
            id={fieldKey}
            inputMode="decimal"
            type="text"
            value={inputValue}
            onChange={(e) =>
              onChange(parsePercentInput(e.target.value) ?? null)
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm tabular-nums text-right"
            aria-invalid={!!error}
            aria-describedby={describedBy}
          />
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            aria-hidden={true}
          >
            %
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
  },

  filterOps: [
    { op: "gt", label: "Greater than" },
    { op: "lt", label: "Less than" },
    { op: "between", label: "Between" },
  ],

  exportAdapter: (value) => value ?? null,
};
