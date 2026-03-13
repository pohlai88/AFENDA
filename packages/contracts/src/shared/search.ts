/**
 * src/shared/search.ts
 *
 * Enterprise-grade search primitives and helpers.
 *
 * Goals:
 *  - Provide small, well-typed zod schemas for search requests and responses.
 *  - Define a stable SearchIndex adapter interface so domains can plug different engines.
 *  - Offer lightweight helpers for normalizing search text and building filter clauses.
 *
 * Notes:
 *  - Keep payloads small; heavy aggregations and analytics belong in read-models or the search engine.
 *  - The adapter interface is intentionally minimal to allow different backends
 *    (Elasticsearch, OpenSearch, Postgres full-text, Meilisearch).
 */

import { z } from "zod";
import {
  PaginationSchema,
  CursorParamsSchema,
  CURSOR_LIMIT_MAX,
  type CursorPayload,
} from "./pagination.js";
import { UuidSchema } from "./ids.js";
import { DateSchema } from "./datetime.js";

/* -------------------------------------------------------------------------- */
/* Search request schemas                                                     */
/* -------------------------------------------------------------------------- */

/** Simple key/value filter for search queries. */
export const SearchFilterSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["eq", "neq", "in", "nin", "lt", "lte", "gt", "gte", "exists", "contains"]),
  // Value is optional for exists checks; otherwise should be provided.
  value: z.unknown().optional(),
});
export type SearchFilter = z.infer<typeof SearchFilterSchema>;

/** Sort descriptor for search results. */
export const SortDescriptorSchema = z.object({
  field: z.string().min(1),
  // direction: asc | desc
  dir: z.enum(["asc", "desc"]).default("desc"),
});
export type SortDescriptor = z.infer<typeof SortDescriptorSchema>;

/** Optional date filter window for common list/search scenarios. */
export const SearchDateRangeSchema = z
  .object({
    fromDate: DateSchema.optional(),
    toDate: DateSchema.optional(),
  })
  .refine(
    (value) => !value.fromDate || !value.toDate || value.fromDate <= value.toDate,
    "fromDate must be on or before toDate",
  );
export type SearchDateRange = z.infer<typeof SearchDateRangeSchema>;

/**
 * Canonical search query schema used by domains.
 *
 * - `q` is the free-text search string (optional).
 * - `filters` is an array of structured filters.
 * - `sort` is an ordered list of sort descriptors.
 * - `pagination` uses the shared cursor-style pagination schema.
 */
export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  filters: z.array(SearchFilterSchema).optional(),
  sort: z.array(SortDescriptorSchema).optional(),
  pagination: z.union([PaginationSchema, CursorParamsSchema]).optional(),
  // Optional hint for which fields to return (projection).
  fields: z.array(z.string().min(1)).max(CURSOR_LIMIT_MAX).optional(),
  dateRange: SearchDateRangeSchema.optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Search response schemas                                                    */
/* -------------------------------------------------------------------------- */

/** Single search hit with optional score and source payload. */
export const SearchHitSchema = z.object({
  id: UuidSchema,
  score: z.number().optional(),
  source: z.record(z.string(), z.unknown()).optional(),
});
export type SearchHit = z.infer<typeof SearchHitSchema>;

/** Generic search response. */
export const SearchResponseSchema = z.object({
  hits: z.array(SearchHitSchema),
  total: z.number().int().nonnegative(),
  tookMs: z.number().int().nonnegative().optional(),
  // Optional cursor for cursor-style pagination.
  nextCursor: z.string().nullable().optional(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Search adapter interface                                                   */
/* -------------------------------------------------------------------------- */

/**
 * SearchIndex interface.
 *
 * Implementations should be resilient and idempotent. Methods accept plain JS
 * objects and return typed results. Domain code should not depend on
 * engine-specific types.
 */
export interface SearchIndex {
  /**
   * index: upsert a single document into the index.
   */
  index(
    id: string,
    doc: Record<string, unknown>,
    opts?: { orgId?: string; refresh?: boolean },
  ): Promise<void>;

  /**
   * bulkIndex: upsert multiple documents in a single call.
   */
  bulkIndex(
    items: Array<{ id: string; doc: Record<string, unknown> }>,
    opts?: { orgId?: string; refresh?: boolean },
  ): Promise<void>;

  /**
   * remove: delete a document by id.
   */
  remove(id: string, opts?: { orgId?: string; refresh?: boolean }): Promise<void>;

  /**
   * search: execute a search query and return a SearchResponse.
   */
  search(query: SearchQuery, opts?: { orgId?: string }): Promise<SearchResponse>;

  /**
   * reindexAll: rebuild the index from source. Implementation-specific.
   */
  reindexAll?(opts?: { orgId?: string }): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Helpers and utilities                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Normalize free-text search input:
 * - trim, collapse whitespace, remove control chars, limit length.
 * - returns undefined for empty input.
 */
export function normalizeSearchText(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim().replace(/\s+/g, " ");
  const cleaned = trimmed.replace(/[\u0000-\u001F\u007F]/g, "");
  if (cleaned.length === 0) return undefined;
  return cleaned.length > 200 ? cleaned.slice(0, 200) : cleaned;
}

/**
 * Tokenize a search string into simple tokens for lightweight client-side filtering.
 * - Splits on whitespace and punctuation, lowercases tokens, removes short tokens.
 */
export function tokenizeSearchText(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[\s\p{P}\p{S}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

/**
 * Build a safe filter clause for the adapter layer.
 * - This helper is intentionally small; adapters should translate to engine DSL.
 */
export function buildFilterClause(filters?: SearchFilter[]): Record<string, unknown> | undefined {
  if (!filters || filters.length === 0) return undefined;
  return {
    and: filters.map((filter) => ({
      field: filter.field,
      op: filter.op,
      value: filter.value,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Default sort helpers                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Default sort mapping for common domains.
 * Domains can override or extend this mapping.
 */
export const DefaultSorts: Record<string, SortDescriptor[]> = {
  // Example: tasks default to dueDate desc then createdAt desc.
  task: [
    { field: "dueDate", dir: "desc" },
    { field: "createdAt", dir: "desc" },
  ],
  workflowRun: [{ field: "startedAt", dir: "desc" }],
};

/* -------------------------------------------------------------------------- */
/* Lightweight SQL helper for cursor -> where clause (optional)              */
/* -------------------------------------------------------------------------- */

/**
 * cursorToSqlWhere
 *
 * - Demonstrates converting cursor payload into a SQL WHERE fragment.
 * - Returns a small object with `where` and `params`.
 * - Domain code should adapt this to their query builder.
 */
export function cursorToSqlWhere(
  cursorPayload: CursorPayload | undefined,
  sortField = "id",
): { where: string; params: unknown[] } | undefined {
  if (!cursorPayload || !cursorPayload.lastId) return undefined;

  // For v=1 we only support lexicographic id-based continuation.
  // For numeric sort keys, consumers should implement domain-specific logic.
  return {
    where: `${sortField} > $1`,
    params: [cursorPayload.lastId],
  };
}

/* -------------------------------------------------------------------------- */
/* Exports bundle                                                             */
/* -------------------------------------------------------------------------- */

export const SharedSearch = {
  SearchFilterSchema,
  SortDescriptorSchema,
  SearchDateRangeSchema,
  SearchQuerySchema,
  SearchResponseSchema,
  SearchHitSchema,
  normalizeSearchText,
  tokenizeSearchText,
  buildFilterClause,
  DefaultSorts,
  cursorToSqlWhere,
};

export default SharedSearch;
