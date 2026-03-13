/**
 * src/shared/datetime.ts
 *
 * Canonical UTC datetime and date helpers used across services, migrations,
 * and DB builders.
 *
 * - All instants are ISO 8601 strings with Z (UTC).
 * - Business dates are YYYY-MM-DD (date-only) and represent the calendar day in UTC.
 * - Helpers provide truncation, start/end-of-day, SQL-friendly formatting, and safe parsing.
 */

import { z } from "zod";
import { getClock } from "./clock.js";

/* -------------------------------------------------------------------------- */
/* Schemas and types                                                          */
/* -------------------------------------------------------------------------- */

/** ISO date (YYYY-MM-DD) used for business dates and partitioning. */
export const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD (ISO date)");

export type DateString = z.infer<typeof DateSchema>;
// Backward-compatible alias retained for existing callers.
export type IsoDate = DateString;

/**
 * UTC datetime string (ISO 8601) with Z suffix.
 * Accepts seconds or milliseconds precision.
 */
const utcIsoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export const UtcDateTimeSchema = z
  .string()
  .refine((s) => typeof s === "string" && utcIsoRegex.test(s) && !Number.isNaN(Date.parse(s)), {
    message: "Must be an ISO 8601 UTC datetime string with Z suffix",
  });

export type UtcDateTime = z.infer<typeof UtcDateTimeSchema>;

/** Date range schema using ISO date strings (YYYY-MM-DD). */
export const DateRangeSchema = z
  .object({
    from: DateSchema.optional(),
    to: DateSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.from && val.to) {
      const fromMs = Date.parse(`${val.from}T00:00:00.000Z`);
      const toMs = Date.parse(`${val.to}T00:00:00.000Z`);
      if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "from and to must be valid ISO dates",
        });
        return;
      }
      if (fromMs > toMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "from must be on or before to",
          path: ["from", "to"],
        });
      }
    }
  });

export type DateRange = z.infer<typeof DateRangeSchema>;

/* -------------------------------------------------------------------------- */
/* Low-level conversions                                                      */
/* -------------------------------------------------------------------------- */

/** Convert input (Date | ISO string) to a Date instance (UTC). */
export function toDate(input: Date | string): Date {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) throw new Error("Invalid Date instance");
    return new Date(input.toISOString());
  }
  if (typeof input === "string") {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid ISO datetime string");
    return new Date(d.toISOString());
  }
  throw new Error("toDate: unsupported input type");
}

/* -------------------------------------------------------------------------- */
/* Truncation / precision helpers                                             */
/* -------------------------------------------------------------------------- */

/** Truncate an instant to seconds precision (zero milliseconds). */
export function truncateToSecondsUtc(input: Date | string): UtcDateTime {
  const d = toDate(input);
  d.setUTCMilliseconds(0);
  return d.toISOString();
}

/** Truncate an instant to canonical milliseconds precision. */
export function truncateToMillisUtc(input: Date | string): UtcDateTime {
  const d = toDate(input);
  return d.toISOString();
}

/* -------------------------------------------------------------------------- */
/* SQL / DB formatting helpers                                                */
/* -------------------------------------------------------------------------- */

/** Convert a Date/ISO string to a SQL TIMESTAMPTZ-friendly UTC string. */
export function toSqlTimestampUtc(
  input: Date | string,
  precision: "seconds" | "millis" = "millis",
): string {
  if (precision === "seconds") return truncateToSecondsUtc(input);
  return truncateToMillisUtc(input);
}

/* -------------------------------------------------------------------------- */
/* Day boundary helpers                                                       */
/* -------------------------------------------------------------------------- */

/** Return the ISO instant at 00:00:00.000Z for the given UTC day. */
export function startOfDayUtc(dateOrIso: Date | string): UtcDateTime {
  let dateStr: string;
  if (dateOrIso instanceof Date) {
    dateStr = dateOrIso.toISOString().slice(0, 10);
  } else if (typeof dateOrIso === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOrIso)) {
      dateStr = dateOrIso;
    } else {
      dateStr = toDate(dateOrIso).toISOString().slice(0, 10);
    }
  } else {
    throw new Error("startOfDayUtc: unsupported input");
  }
  return `${dateStr}T00:00:00.000Z`;
}

/**
 * Return the ISO instant at end of day.
 * - inclusive=true: 23:59:59.999Z
 * - inclusive=false: next day 00:00:00.000Z (exclusive upper bound)
 */
export function endOfDayUtc(dateOrIso: Date | string, inclusive = true): UtcDateTime {
  const start = startOfDayUtc(dateOrIso);
  if (inclusive) {
    const d = toDate(start);
    d.setUTCHours(23, 59, 59, 999);
    return d.toISOString();
  }

  const d = toDate(start);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

/** Parse an ISO date string (YYYY-MM-DD) to UTC midnight instant. */
export function parseIsoDateToUtcMidnight(dateStr: DateString): UtcDateTime {
  DateSchema.parse(dateStr);
  return `${dateStr}T00:00:00.000Z`;
}

/**
 * Return the ISO date string (YYYY-MM-DD) for a given UTC instant.
 * Useful for deterministic partition keys in reporting and ledgers.
 */
export function datePartitionFor(input: Date | string): DateString {
  const d = toDate(input);
  const dateStr = d.toISOString().slice(0, 10);
  return DateSchema.parse(dateStr);
}

/**
 * Return a Postgres expression for deriving a DATE partition from a timestamptz column.
 * Example: (occurred_at AT TIME ZONE 'UTC')::date
 */
export function datePartitionColumnExpr(columnName = "occurred_at"): string {
  return `(${columnName} AT TIME ZONE 'UTC')::date`;
}

/**
 * Return a generated-column SQL fragment for UTC date partitioning.
 */
export function datePartitionColumnDefinition(
  columnName = "occurred_at",
  partitionCol = "date_partition",
): string {
  return `${partitionCol} DATE GENERATED ALWAYS AS ((${columnName} AT TIME ZONE 'UTC')::date) STORED`;
}

/* -------------------------------------------------------------------------- */
/* Convenience: current-time helpers (use Clock)                              */
/* -------------------------------------------------------------------------- */

/** Return current instant as ISO UTC string using the shared Clock. */
export function nowUtc(): UtcDateTime {
  return getClock().nowIso();
}

/** Return current instant truncated to seconds. */
export function nowUtcTruncatedToSeconds(): UtcDateTime {
  return truncateToSecondsUtc(nowUtc());
}

/* -------------------------------------------------------------------------- */
/* Backward-compatible helpers                                                */
/* -------------------------------------------------------------------------- */

/** Backward-compatible alias. */
export function toUtcString(date: Date): UtcDateTime {
  return truncateToMillisUtc(date);
}

/** Backward-compatible alias returning Date at UTC midnight. */
export function parseIsoDate(dateStr: string): Date {
  return toDate(parseIsoDateToUtcMidnight(DateSchema.parse(dateStr)));
}

/** Backward-compatible parser alias. */
export function parseUtcDateTime(isoUtc: string): Date {
  UtcDateTimeSchema.parse(isoUtc);
  return toDate(isoUtc);
}

/** Backward-compatible date formatter. */
export function formatDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10) as IsoDate;
}

/** Backward-compatible date-range validator. */
export function validateDateRange(opts: {
  fromDate?: string | null | undefined;
  toDate?: string | null | undefined;
}): { fromDate?: IsoDate; toDate?: IsoDate } {
  const fromDate = opts.fromDate ?? undefined;
  const toDate = opts.toDate ?? undefined;

  if (fromDate != null) DateSchema.parse(fromDate);
  if (toDate != null) DateSchema.parse(toDate);

  DateRangeSchema.parse({ from: fromDate, to: toDate });
  return { fromDate, toDate };
}

/** Backward-compatible safe parser. */
export function tryParseIsoDate(value: unknown): IsoDate | undefined {
  if (typeof value !== "string") return undefined;
  const result = DateSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

/** Backward-compatible safe parser. */
export function tryParseUtcDateTime(value: unknown): UtcDateTime | undefined {
  if (typeof value !== "string") return undefined;
  const result = UtcDateTimeSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

/* -------------------------------------------------------------------------- */
/* Exports bundle                                                             */
/* -------------------------------------------------------------------------- */

export const SharedDatetime = {
  DateSchema,
  DateRangeSchema,
  UtcDateTimeSchema,
  truncateToSecondsUtc,
  truncateToMillisUtc,
  toSqlTimestampUtc,
  startOfDayUtc,
  endOfDayUtc,
  parseIsoDateToUtcMidnight,
  datePartitionFor,
  datePartitionColumnExpr,
  datePartitionColumnDefinition,
  toDate,
  nowUtc,
  nowUtcTruncatedToSeconds,
  // compatibility exports
  toUtcString,
  parseIsoDate,
  parseUtcDateTime,
  formatDate,
  validateDateRange,
  tryParseIsoDate,
  tryParseUtcDateTime,
};

export default SharedDatetime;
