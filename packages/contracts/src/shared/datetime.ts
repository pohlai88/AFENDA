/**
 * Shared datetime primitives.
 *
 * RULES:
 *   1. All timestamps flowing through the API are UTC strings with a 'Z' suffix.
 *      Reject anything without it — silent timezone drift corrupts audit logs.
 *   2. `UtcDateTimeSchema` is the single source of truth for timestamp validation.
 *      Do NOT redefine it in domain files; import from here.
 *   3. `DateSchema` is for calendar-date-only fields (YYYY-MM-DD). Use it for
 *      business dates (due dates, period dates) where time-of-day is irrelevant.
 *   4. Both schemas are already validated at the string level; the DB layer must
 *      also store them as `timestamptz` or `date` respectively.
 *   5. `DateRangeSchema` is the shared range primitive for report/filter windows.
 *      Do NOT define ad-hoc `{ from, to }` shapes in domain files.
 */
import { z } from "zod";

/**
 * ISO-8601 UTC datetime string.
 * Trims whitespace, validates ISO-8601, and enforces the mandatory 'Z' suffix
 * so timezone drift can never silently corrupt audit trails or event ordering.
 */
export const UtcDateTimeSchema = z
  .string()
  .trim()
  .datetime()
  .refine((s) => s.endsWith("Z"), {
    message: "timestamp must be UTC (end with 'Z')",
  });

export type UtcDateTime = z.infer<typeof UtcDateTimeSchema>;

/**
 * Calendar-date-only string (YYYY-MM-DD).
 * Trims whitespace, validates format, and round-trips through `Date` to reject
 * impossible calendar dates like 2026-02-30. Stays timezone-ambiguity-free
 * because it carries no time component.
 */
export const DateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
  .refine(
    (s) => {
      const d = new Date(`${s}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
    },
    { message: "invalid calendar date" },
  );

export type DateString = z.infer<typeof DateSchema>;

/**
 * Inclusive date range (from <= to).
 * Shared primitive for report filters, fiscal period selectors, and audit
 * date-range queries. Prevents ad-hoc `{ from, to }` shapes across domains.
 */
export const DateRangeSchema = z
  .object({
    from: DateSchema,
    to: DateSchema,
  })
  .refine((r) => r.from <= r.to, { message: "from must be <= to" });

export type DateRange = z.infer<typeof DateRangeSchema>;
