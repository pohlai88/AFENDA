/**
 * src/shared/queries.ts
 *
 * Shared query primitives, schemas, and lightweight adapter contracts.
 *
 * Goals:
 *  - Provide canonical shapes for read/query inputs and outputs.
 *  - Define a minimal QueryHandler interface so domains can implement consistent handlers.
 *  - Offer small helpers for cache keys, SQL cursor where fragments, and typed result envelopes.
 *
 * RULES:
 *  - Queries are read-only and must not carry idempotency keys or mutate state.
 *  - Pagination should reuse shared/pagination.ts primitives.
 *  - Query handlers return plain data or a structured not-found error for expected misses.
 */

import { z } from "zod";
import { type CursorPayload, PaginationSchema, type PageResult } from "./pagination.js";
import { UtcDateTimeSchema } from "./datetime.js";
import { OrgIdSchema, PrincipalIdSchema, EntityIdSchema } from "./ids.js";
import { SearchQuerySchema, type SearchQuery } from "./search.js";
import { ApiErrorSchema } from "./errors.js";

/* -------------------------------------------------------------------------- */
/* Common query parameter schemas                                             */
/* -------------------------------------------------------------------------- */

/**
 * BaseQueryParams
 * - orgId and principalId are optional here; domain handlers may require them.
 * - `asOf` is an optional UTC datetime for time-travel or reporting queries.
 */
export const BaseQueryParamsSchema = z.object({
  orgId: OrgIdSchema.optional(),
  principalId: PrincipalIdSchema.optional(),
  asOf: UtcDateTimeSchema.optional(),
});

export type BaseQueryParams = z.infer<typeof BaseQueryParamsSchema>;

/**
 * IdQueryParams: canonical single-entity lookup by id.
 */
export const IdQueryParamsSchema = z.object({
  id: EntityIdSchema,
  orgId: OrgIdSchema.optional(),
  principalId: PrincipalIdSchema.optional(),
  asOf: UtcDateTimeSchema.optional(),
});
export type IdQueryParams = z.infer<typeof IdQueryParamsSchema>;

/**
 * BulkIdsQueryParams: canonical bulk lookup by ids.
 */
export const BulkIdsQueryParamsSchema = z.object({
  ids: z.array(EntityIdSchema).min(1).max(200),
  orgId: OrgIdSchema.optional(),
  principalId: PrincipalIdSchema.optional(),
});
export type BulkIdsQueryParams = z.infer<typeof BulkIdsQueryParamsSchema>;

/* -------------------------------------------------------------------------- */
/* Cursor query / list params                                                 */
/* -------------------------------------------------------------------------- */

/**
 * CursorListParams: items + pagination cursor.
 */
export const CursorListParamsSchema = z.object({
  pagination: PaginationSchema.optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  sort: z
    .array(
      z.object({
        field: z.string().min(1),
        dir: z.enum(["asc", "desc"]),
      }),
    )
    .optional(),
});
export type CursorListParams = z.infer<typeof CursorListParamsSchema>;

/* -------------------------------------------------------------------------- */
/* Search query wrapper                                                       */
/* -------------------------------------------------------------------------- */

/** Wrapper around shared SearchQuerySchema. */
export const SearchListParamsSchema = SearchQuerySchema;
export type SearchListParams = SearchQuery;

/* -------------------------------------------------------------------------- */
/* Query result shapes                                                        */
/* -------------------------------------------------------------------------- */

/** Canonical not-found error shape for expected misses in query handlers. */
export const QueryNotFoundErrorSchema = ApiErrorSchema.extend({
  code: z.literal("SHARED_NOT_FOUND"),
});
export type QueryNotFoundError = z.infer<typeof QueryNotFoundErrorSchema>;

/**
 * QueryResult<T>
 * - Standard result for single-entity queries.
 */
export type QueryResult<T> =
  | { found: true; data: T }
  | { found: false; error?: QueryNotFoundError };

/** Cursor list result shape reused from pagination. */
export type CursorPageResult<T> = PageResult<T>;

/* -------------------------------------------------------------------------- */
/* Query handler interface                                                    */
/* -------------------------------------------------------------------------- */

/**
 * QueryHandler
 *
 * Example:
 *   const handler: QueryHandler<typeof IdQueryParamsSchema, Invoice> = {
 *     schema: IdQueryParamsSchema,
 *     handle: async (params) => ({ ... })
 *   };
 */
export interface QueryHandler<P extends z.ZodTypeAny, R> {
  schema: P;
  handle(params: z.infer<P>, opts?: QueryOptions): Promise<R>;
}

/* -------------------------------------------------------------------------- */
/* Query options and caching hints                                            */
/* -------------------------------------------------------------------------- */

export type QueryOptions = {
  cacheTTLSeconds?: number;
  consistency?: "strong" | "eventual";
  bypassCache?: boolean;
};

/** Build a canonical cache key with stable key ordering. */
export function buildQueryCacheKey(prefix: string, params: unknown): string {
  function stableStringify(input: unknown): string {
    if (input === null || typeof input !== "object") return JSON.stringify(input);
    if (Array.isArray(input)) return `[${input.map(stableStringify).join(",")}]`;

    const record = input as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(",")}}`;
  }

  return `${prefix}:${stableStringify(params)}`;
}

/* -------------------------------------------------------------------------- */
/* SQL cursor helper                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Convert a CursorPayload into a SQL WHERE fragment for continuation.
 */
export function cursorPayloadToSqlWhere(
  cursor?: CursorPayload,
  sortField = "id",
  idField = "id",
): { where: string; params: unknown[] } | undefined {
  if (!cursor || cursor.v === undefined || !cursor.lastId) return undefined;

  if (cursor.v === 1) {
    if (cursor.lastSortValue !== undefined && cursor.lastSortValue !== null) {
      return {
        where: `(${sortField}, ${idField}) > ($1, $2)`,
        params: [cursor.lastSortValue, cursor.lastId],
      };
    }

    return {
      where: `${idField} > $1`,
      params: [cursor.lastId],
    };
  }

  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Small runtime helpers                                                      */
/* -------------------------------------------------------------------------- */

/** Validate and normalize query params via schema.parse. */
export function normalizeQueryParams<P extends z.ZodTypeAny>(
  schema: P,
  params: unknown,
): z.infer<P> {
  return schema.parse(params);
}

/** Create standard not-found query result. */
export function makeNotFoundQueryResult(message = "entity not found"): QueryResult<never> {
  return {
    found: false,
    error: QueryNotFoundErrorSchema.parse({
      code: "SHARED_NOT_FOUND",
      message,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Example handler factory (lightweight)                                      */
/* -------------------------------------------------------------------------- */

/**
 * Convenience factory for simple id-based queries.
 */
export function makeIdQueryHandler<T>(
  fetchById: (params: IdQueryParams) => Promise<T | null>,
): QueryHandler<typeof IdQueryParamsSchema, QueryResult<T>> {
  return {
    schema: IdQueryParamsSchema,
    async handle(params) {
      const entity = await fetchById(params);
      if (entity == null) {
        return makeNotFoundQueryResult() as QueryResult<T>;
      }
      return { found: true, data: entity };
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Exports bundle                                                             */
/* -------------------------------------------------------------------------- */

export const SharedQueries = {
  BaseQueryParamsSchema,
  IdQueryParamsSchema,
  BulkIdsQueryParamsSchema,
  CursorListParamsSchema,
  SearchListParamsSchema,
  QueryNotFoundErrorSchema,
  buildQueryCacheKey,
  cursorPayloadToSqlWhere,
  normalizeQueryParams,
  makeNotFoundQueryResult,
  makeIdQueryHandler,
};

export default SharedQueries;
