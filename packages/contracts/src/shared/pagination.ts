/**
 * Cursor-based pagination query parameters.
 *
 * RULES:
 *   1. `limit` is clamped to [1, CURSOR_LIMIT_MAX]; defaults to CURSOR_LIMIT_DEFAULT.
 *      Export the constants so every layer (API, docs, tests) stays in sync.
 *   2. Empty query-string values (`?cursor=`, `?limit=`) are coerced to
 *      `undefined` — NOT passed through as `""` or `NaN`.
 *   3. `cursor` is opaque — callers must echo the exact value from the previous
 *      response. Never construct or decode a cursor outside the data layer.
 *   4. Response shape lives in `envelope.ts` (`makeCursorEnvelopeSchema`).
 */
import { z } from "zod";

export const CURSOR_LIMIT_DEFAULT = 20 as const;
export const CURSOR_LIMIT_MAX = 100 as const;

/**
 * Coerces empty query-string values to `undefined` so `?cursor=` and
 * `?limit=` are treated as "not provided" rather than "" or NaN.
 */
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const CursorParamsSchema = z.object({
  /**
   * Opaque pagination cursor. Clients must pass the exact value returned
   * by the previous response — do not construct or decode it.
   */
  cursor: z.preprocess(emptyToUndefined, z.string().min(1).optional()),

  /** Number of items per page. Clamped to [1, CURSOR_LIMIT_MAX]. */
  limit: z
    .preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(CURSOR_LIMIT_MAX).optional())
    .default(CURSOR_LIMIT_DEFAULT),
});

export type CursorParams = z.infer<typeof CursorParamsSchema>;

/**
 * Generic cursor-based page response.
 * Used by all list queries (AP, GL, etc.) for a consistent shape.
 */
export interface CursorPage<T> {
  data: T[];
  cursor: string | null;
  hasMore: boolean;
}
