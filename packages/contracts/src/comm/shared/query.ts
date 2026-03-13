import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";

type DateOrderRefinementInput = Record<string, unknown>;

interface DateOrderRefinementOptions {
  fromKey: string;
  toKey: string;
  message: string;
  path?: Array<string | number>;
}

/** Default list page size for comm modules. */
export const COMM_LIST_LIMIT_DEFAULT = 50 as const;

/** Maximum list page size for comm modules. */
export const COMM_LIST_LIMIT_MAX = 200 as const;

/** Default search page size for comm modules. */
export const COMM_SEARCH_LIMIT_DEFAULT = 20 as const;

/** Maximum search page size for comm modules. */
export const COMM_SEARCH_LIMIT_MAX = 50 as const;

/** Reusable query text schema used by list/search endpoints. */
export const CommQueryTextSchema = z.string().trim().min(1).max(200);

/** Reusable list limit schema with consistent defaults. */
export const CommListLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(COMM_LIST_LIMIT_MAX)
  .optional()
  .default(COMM_LIST_LIMIT_DEFAULT);

/** Reusable search limit schema with consistent defaults. */
export const CommSearchLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(COMM_SEARCH_LIMIT_MAX)
  .optional()
  .default(COMM_SEARCH_LIMIT_DEFAULT);

/**
 * Reusable date range schema for filters and summaries.
 * Inclusive boundaries where both values are provided.
 */
export const CommDateRangeSchema = z
  .object({
    fromDate: DateSchema.optional(),
    toDate: DateSchema.optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "fromDate",
      toKey: "toDate",
      message: "fromDate must be on or before toDate.",
    });
  });

export function applyDateOrderRefinement(
  data: DateOrderRefinementInput,
  ctx: z.RefinementCtx,
  options: DateOrderRefinementOptions,
): void {
  const fromValue = data[options.fromKey];
  const toValue = data[options.toKey];

  if (typeof fromValue !== "string" || typeof toValue !== "string") {
    return;
  }

  if (toValue < fromValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: options.message,
      path: options.path ?? [options.toKey],
    });
  }
}

export type CommQueryText = z.infer<typeof CommQueryTextSchema>;
export type CommListLimit = z.infer<typeof CommListLimitSchema>;
export type CommSearchLimit = z.infer<typeof CommSearchLimitSchema>;
export type CommDateRange = z.infer<typeof CommDateRangeSchema>;
