/**
 * src/shared/validation.ts
 *
 * Small collection of reusable zod refinements and validation helpers
 * used across domains to keep business rules consistent and DRY.
 *
 * - Provide common `superRefine` helpers (unique arrays, at-least-one-field).
 * - Provide small schema factories (non-empty trimmed string, limited-length text).
 * - Provide helpers that compose other shared primitives (dates, ids).
 *
 * Design goals:
 * - Keep helpers tiny and well-documented so they are easy to reason about in reviews.
 * - Prefer explicit errors (ZodIssue) with clear `path` so API clients can surface them.
 */

import { z } from "zod";
import { DateSchema } from "./datetime.js";

/* -------------------------------------------------------------------------- */
/* Generic refinement helpers                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Ensure at least one of the listed keys is present and non-empty on an object.
 *
 * Usage:
 *   z.object({ a: z.string().optional(), b: z.string().optional() })
 *     .superRefine(atLeastOneOf(["a", "b"], "provide a or b"));
 */
export function atLeastOneOf(keys: string[], message = "at least one field must be provided") {
  return (obj: Record<string, unknown>, ctx: z.RefinementCtx): void => {
    const hasOne = keys.some((key) => {
      const value = obj[key];
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });

    if (!hasOne) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: [],
      });
    }
  };
}

/**
 * Enforce uniqueness in an array.
 *
 * Adds an issue at the first duplicate index found. The `keyFn` can be used to
 * derive a comparison key from complex items.
 *
 * Example:
 *   z.array(z.object({ id: z.string() })).superRefine(uniqueArray((x) => x.id));
 */
export function uniqueArray<T>(
  keyFn?: (item: T) => unknown,
  message = "array must not contain duplicate values",
) {
  return (arr: T[], ctx: z.RefinementCtx): void => {
    const seen = new Set<string>();
    for (const [i, item] of arr.entries()) {
      const keySource = keyFn ? keyFn(item) : item;
      const key = String(keySource);
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: [i],
        });
      } else {
        seen.add(key);
      }
    }
  };
}

/**
 * Ensure the combined length of multiple string fields does not exceed a limit.
 *
 * Example:
 *   .superRefine(maxAggregateLength(["title", "description"], 1000));
 */
export function maxAggregateLength(fields: string[], maxLen: number, message?: string) {
  return (obj: Record<string, unknown>, ctx: z.RefinementCtx): void => {
    let total = 0;
    for (const field of fields) {
      const value = obj[field];
      if (typeof value === "string") total += value.length;
    }

    if (total > maxLen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: message ?? `combined length of ${fields.join(", ")} must be <= ${maxLen}`,
        path: [],
      });
    }
  };
}

/* -------------------------------------------------------------------------- */
/* Small schema factories                                                     */
/* -------------------------------------------------------------------------- */

/** Non-empty trimmed string (useful for names/titles). */
export const NonEmptyTrimmedString = (min = 1, max = 200) =>
  z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length >= min, { message: `must be at least ${min} characters` })
    .refine((value) => value.length <= max, { message: `must be at most ${max} characters` });

/** Optional non-empty trimmed string (returns undefined for empty/blank input). */
export const OptionalNonEmptyTrimmedString = (max = 200) =>
  z
    .union([z.string(), z.undefined(), z.null()])
    .transform((value) => {
      if (value == null) return undefined;
      const normalized = String(value).trim();
      return normalized.length === 0 ? undefined : normalized;
    })
    .refine((value) => value === undefined || value.length <= max, {
      message: `must be at most ${max} characters`,
    })
    .optional();

/** Limited text block (e.g., description) with a configurable max length. */
export const LimitedText = (max = 2000) =>
  z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= max, { message: `must be at most ${max} characters` });

/* -------------------------------------------------------------------------- */
/* Date range helper                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Validate an ISO date range object with optional from/to keys.
 *
 * - Accepts { from?: string, to?: string } and validates each with DateSchema.
 * - Ensures from <= to when both provided.
 * - Returns normalized { from?: string, to?: string } or throws ZodError.
 */
export function validateIsoDateRange(obj: { from?: unknown; to?: unknown }) {
  const schema = z
    .object({
      from: z.union([z.string(), z.undefined(), z.null()]).optional(),
      to: z.union([z.string(), z.undefined(), z.null()]).optional(),
    })
    .superRefine((value, ctx) => {
      const from = value.from == null ? undefined : String(value.from);
      const to = value.to == null ? undefined : String(value.to);

      if (from !== undefined) {
        const parsedFrom = DateSchema.safeParse(from);
        if (!parsedFrom.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "from must be a valid ISO date YYYY-MM-DD",
            path: ["from"],
          });
        }
      }

      if (to !== undefined) {
        const parsedTo = DateSchema.safeParse(to);
        if (!parsedTo.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "to must be a valid ISO date YYYY-MM-DD",
            path: ["to"],
          });
        }
      }

      if (from !== undefined && to !== undefined) {
        const fromTime = new Date(`${from}T00:00:00Z`).getTime();
        const toTime = new Date(`${to}T00:00:00Z`).getTime();
        if (Number.isNaN(fromTime) || Number.isNaN(toTime)) {
          return;
        }
        if (fromTime > toTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "from must be on or before to",
            path: ["from", "to"],
          });
        }
      }
    });

  return schema.parse(obj);
}

/* -------------------------------------------------------------------------- */
/* Utility: ensure one-of-fields present (typed wrapper)                     */
/* -------------------------------------------------------------------------- */

/**
 * Typed wrapper that returns a zod `superRefine` function for object schemas.
 *
 * Example:
 *   const schema = z.object({ a: z.string().optional(), b: z.string().optional() })
 *     .superRefine(atLeastOneOfKeys(["a", "b"], "provide a or b"));
 */
export function atLeastOneOfKeys(keys: string[], message?: string) {
  return atLeastOneOf(keys, message);
}

/* -------------------------------------------------------------------------- */
/* Export bundle                                                              */
/* -------------------------------------------------------------------------- */

export const SharedValidation = {
  atLeastOneOf,
  uniqueArray,
  maxAggregateLength,
  NonEmptyTrimmedString,
  OptionalNonEmptyTrimmedString,
  LimitedText,
  validateIsoDateRange,
  atLeastOneOfKeys,
};

export default SharedValidation;
