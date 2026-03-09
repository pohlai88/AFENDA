"use client";

/**
 * date field kit — date-only business field (YYYY-MM-DD), locale display, calendar widget.
 *
 * RULES:
 * - Canonical value is always a date-only string: YYYY-MM-DD
 * - Never treat this as a timestamp
 * - Never serialize selected dates via toISOString() for persistence
 * - JS Date is only a UI helper for the calendar widget
 */
import { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { FieldKit } from "../types";
import { Label } from "../../components/label";
import { Button } from "../../components/button";
import { Calendar } from "../../components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/popover";
import { cn } from "../../lib/utils";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDateOnly(value: string): boolean {
  return DATE_ONLY_RE.test(value);
}

/**
 * Parse YYYY-MM-DD into a local Date for calendar/display usage.
 * Uses local noon to avoid timezone edge cases around midnight transitions.
 */
function parseDateOnly(value?: string | null): Date | undefined {
  if (!value || !isDateOnly(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  // Guard against impossible dates like 2026-02-31
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function dateToYyyyMmDd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateOnly(value?: string | null, pattern = "PPP"): string {
  const date = parseDateOnly(value);
  return date ? format(date, pattern) : "—";
}

export const dateKit: FieldKit<string> = {
  CellRenderer: ({ value }) => {
    if (!value) {
      return <span className="text-muted-foreground">—</span>;
    }

    const display = formatDateOnly(value, "PP");
    return <span>{display}</span>;
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
    const [open, setOpen] = useState(false);

    // Source of truth stays in `value`
    const selectedDate = useMemo(() => parseDateOnly(value), [value]);

    const handleDateSelect = (nextDate: Date | undefined) => {
      if (!nextDate) {
        onChange("");
        setOpen(false);
        return;
      }

      onChange(dateToYyyyMmDd(nextDate));
      setOpen(false);
    };

    if (readonly) {
      return (
        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
            {formatDateOnly(value)}
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

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={fieldKey}
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground",
                error && "border-destructive"
              )}
              aria-invalid={!!error}
              aria-describedby={
                error
                  ? `${fieldKey}-error`
                  : description
                    ? `${fieldKey}-description`
                    : undefined
              }
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

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
    { op: "before", label: "Before" },
    { op: "after", label: "After" },
    { op: "between", label: "Between" },
  ],

  exportAdapter: (value) => value ?? "",
};
