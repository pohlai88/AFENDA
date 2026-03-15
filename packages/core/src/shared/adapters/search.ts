export type SearchQuery = {
  q?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  sort?: { field: string; direction: "asc" | "desc" }[];
};

export type SearchResult<T> = {
  id: string;
  score: number;
  source: T;
};

export class SearchError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code = "SEARCH_ERROR", details?: unknown) {
    super(message);
    this.name = "SearchError";
    this.code = code;
    this.details = details;
  }
}

export interface SearchIndex<T> {
  index(entity: T & { id: string }): Promise<void>;
  remove(id: string): Promise<void>;
  search(query: SearchQuery): Promise<SearchResult<T>[]>;
  reindexAll(sourceIterator: AsyncIterable<T & { id: string }>): Promise<void>;
}

type QueryResultRow = Record<string, unknown>;

type QueryResult = {
  rows: QueryResultRow[];
};

export type PostgresQueryClient = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

export type ElasticIndexRequest = {
  index: string;
  id: string;
  body: Record<string, unknown>;
  refresh?: "false" | "true" | "wait_for";
};

export type ElasticDeleteRequest = {
  index: string;
  id: string;
  ignore_unavailable?: boolean;
};

export type ElasticSearchRequest = {
  index: string;
  body: Record<string, unknown>;
};

export type ElasticSearchHit<T> = {
  _id: string;
  _score?: number | null;
  _source?: T;
};

export type ElasticSearchResponse<T> = {
  hits?: {
    hits?: ElasticSearchHit<T>[];
  };
};

export type ElasticClientLike = {
  index: (request: ElasticIndexRequest) => Promise<unknown>;
  delete: (request: ElasticDeleteRequest) => Promise<unknown>;
  search: <T>(request: ElasticSearchRequest) => Promise<ElasticSearchResponse<T>>;
};

function validateIdentifier(identifier: string, label: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid ${label}: ${identifier}`);
  }
  return identifier;
}

function asPositiveInt(value: number | undefined, fallback: number, label: string): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be an integer >= 0`);
  }
  return value;
}

function asSortClause(sort: SearchQuery["sort"]): string {
  if (!sort || sort.length === 0) {
    return "score DESC, updated_at DESC";
  }

  const normalized = sort.map((entry) => {
    const field = validateIdentifier(entry.field, "sort field");
    const direction = entry.direction === "asc" ? "ASC" : "DESC";
    return `${field} ${direction}`;
  });

  return normalized.join(", ");
}

export class PostgresSearchAdapter<T> implements SearchIndex<T> {
  private readonly client: PostgresQueryClient;
  private readonly table: string;
  private readonly documentBuilder: (entity: T & { id: string }) => Record<string, unknown>;
  private readonly textExtractor: (entity: T & { id: string }) => string;

  constructor(opts: {
    client: PostgresQueryClient;
    table?: string;
    documentBuilder: (entity: T & { id: string }) => Record<string, unknown>;
    textExtractor: (entity: T & { id: string }) => string;
  }) {
    this.client = opts.client;
    this.table = validateIdentifier(opts.table ?? "search_index", "table");
    this.documentBuilder = opts.documentBuilder;
    this.textExtractor = opts.textExtractor;
  }

  async index(entity: T & { id: string }): Promise<void> {
    const doc = this.documentBuilder(entity);
    const text = this.textExtractor(entity) ?? "";
    const sql = `
      INSERT INTO ${this.table} (id, doc, tsv, updated_at)
      VALUES ($1, $2::jsonb, to_tsvector('simple', $3), now())
      ON CONFLICT (id) DO UPDATE
        SET doc = EXCLUDED.doc,
            tsv = EXCLUDED.tsv,
            updated_at = EXCLUDED.updated_at
    `;

    try {
      await this.client.query(sql, [entity.id, JSON.stringify(doc), text]);
    } catch (error) {
      throw new SearchError("Postgres index failed", "PG_INDEX_ERROR", error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.client.query(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
    } catch (error) {
      throw new SearchError("Postgres remove failed", "PG_REMOVE_ERROR", error);
    }
  }

  async search(query: SearchQuery): Promise<SearchResult<T>[]> {
    try {
      const q = (query.q ?? "").trim();
      const limit = asPositiveInt(query.limit, 25, "limit");
      const offset = asPositiveInt(query.offset, 0, "offset");

      const whereParts: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (query.filters) {
        for (const [key, value] of Object.entries(query.filters)) {
          const safeKey = validateIdentifier(key, "filter key");
          if (value === null) {
            whereParts.push(`(doc->>'${safeKey}') IS NULL`);
            continue;
          }
          whereParts.push(`(doc->>'${safeKey}') = $${paramIndex}`);
          params.push(String(value));
          paramIndex += 1;
        }
      }

      let rankSql = ", 0.0 AS score";
      if (q.length > 0) {
        const qIndex = paramIndex;
        params.push(q);
        paramIndex += 1;
        whereParts.push(`tsv @@ plainto_tsquery('simple', $${qIndex})`);
        rankSql = `, ts_rank(tsv, plainto_tsquery('simple', $${qIndex})) AS score`;
      }

      const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
      const orderSql = asSortClause(query.sort);

      const sql = `
      SELECT id, doc ${rankSql}
      FROM ${this.table}
      ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ${limit} OFFSET ${offset}
    `;

      const res = await this.client.query(sql, params);
      return res.rows.map((row) => ({
        id: String(row.id),
        score: Number(row.score ?? 0),
        source: row.doc as T,
      }));
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw new SearchError("Postgres search failed", "PG_SEARCH_ERROR", error);
    }
  }

  async reindexAll(sourceIterator: AsyncIterable<T & { id: string }>): Promise<void> {
    try {
      for await (const entity of sourceIterator) {
        await this.index(entity);
      }
    } catch (error) {
      throw new SearchError("Postgres reindex failed", "PG_REINDEX_ERROR", error);
    }
  }
}

export class ElasticSearchAdapter<T> implements SearchIndex<T> {
  private readonly client: ElasticClientLike;
  private readonly indexName: string;
  private readonly documentBuilder: (entity: T & { id: string }) => Record<string, unknown>;

  constructor(opts: {
    client: ElasticClientLike;
    index: string;
    documentBuilder: (entity: T & { id: string }) => Record<string, unknown>;
  }) {
    this.client = opts.client;
    this.indexName = opts.index;
    this.documentBuilder = opts.documentBuilder;
  }

  async index(entity: T & { id: string }): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id: entity.id,
        body: this.documentBuilder(entity),
        refresh: "false",
      });
    } catch (error) {
      throw new SearchError("Elastic index failed", "ES_INDEX_ERROR", error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id,
        ignore_unavailable: true,
      });
    } catch (error) {
      throw new SearchError("Elastic remove failed", "ES_REMOVE_ERROR", error);
    }
  }

  async search(query: SearchQuery): Promise<SearchResult<T>[]> {
    const q = (query.q ?? "").trim();
    const size = asPositiveInt(query.limit, 25, "limit");
    const from = asPositiveInt(query.offset, 0, "offset");

    let body: Record<string, unknown> = {
      from,
      size,
      query:
        q.length > 0
          ? {
              multi_match: {
                query: q,
                type: "best_fields",
                fuzziness: "AUTO",
              },
            }
          : { match_all: {} },
    };

    if (query.filters && Object.keys(query.filters).length > 0) {
      const filter = Object.entries(query.filters).map(([key, value]) => ({
        term: { [key]: value },
      }));
      body = {
        ...body,
        query: {
          bool: {
            must: (body.query as Record<string, unknown>) ?? { match_all: {} },
            filter,
          },
        },
      };
    }

    if (query.sort && query.sort.length > 0) {
      body = {
        ...body,
        sort: query.sort.map((entry) => ({ [entry.field]: { order: entry.direction } })),
      };
    }

    try {
      const res = await this.client.search<T>({
        index: this.indexName,
        body,
      });
      const hits = res.hits?.hits ?? [];
      return hits.map((hit) => ({
        id: String(hit._id),
        score: Number(hit._score ?? 0),
        source: (hit._source ?? {}) as T,
      }));
    } catch (error) {
      throw new SearchError("Elastic search failed", "ES_SEARCH_ERROR", error);
    }
  }

  async reindexAll(sourceIterator: AsyncIterable<T & { id: string }>): Promise<void> {
    try {
      for await (const entity of sourceIterator) {
        await this.index(entity);
      }
    } catch (error) {
      throw new SearchError("Elastic reindex failed", "ES_REINDEX_ERROR", error);
    }
  }
}

export class InMemorySearchIndex<T> implements SearchIndex<T> {
  private readonly map = new Map<string, T & { id: string }>();
  private readonly documentBuilder?: (entity: T & { id: string }) => Record<string, unknown>;

  constructor(opts?: {
    documentBuilder?: (entity: T & { id: string }) => Record<string, unknown>;
  }) {
    this.documentBuilder = opts?.documentBuilder;
  }

  async index(entity: T & { id: string }): Promise<void> {
    this.map.set(entity.id, entity);
  }

  async remove(id: string): Promise<void> {
    this.map.delete(id);
  }

  async search(query: SearchQuery): Promise<SearchResult<T>[]> {
    const q = (query.q ?? "").trim().toLowerCase();
    const offset = asPositiveInt(query.offset, 0, "offset");
    const limit = asPositiveInt(query.limit, 25, "limit");
    const source = Array.from(this.map.values());

    const filtered = source
      .filter((entity) => {
        if (!query.filters) return true;
        return Object.entries(query.filters).every(([key, value]) => {
          const current = (entity as Record<string, unknown>)[key];
          return current === value;
        });
      })
      .map((entity) => {
        const doc = this.documentBuilder
          ? this.documentBuilder(entity)
          : (entity as Record<string, unknown>);
        const haystack = JSON.stringify(doc).toLowerCase();
        const score = q.length > 0 ? (haystack.includes(q) ? 1 : 0) : 0;
        return {
          id: entity.id,
          score,
          source: entity as T,
        };
      })
      .filter((item) => q.length === 0 || item.score > 0);

    const sorted =
      query.sort && query.sort.length > 0
        ? [...filtered].sort((a, b) => {
            for (const sortSpec of query.sort ?? []) {
              const field = sortSpec.field;
              const aValue = (a.source as Record<string, unknown>)[field];
              const bValue = (b.source as Record<string, unknown>)[field];
              if (aValue === bValue) continue;
              const comparison =
                (aValue as string | number | bigint) > (bValue as string | number | bigint)
                  ? 1
                  : -1;
              return sortSpec.direction === "asc" ? comparison : -comparison;
            }
            return 0;
          })
        : filtered;

    return sorted.slice(offset, offset + limit);
  }

  async reindexAll(sourceIterator: AsyncIterable<T & { id: string }>): Promise<void> {
    this.map.clear();
    for await (const entity of sourceIterator) {
      this.map.set(entity.id, entity);
    }
  }
}

export const SearchAdapters = {
  PostgresSearchAdapter,
  ElasticSearchAdapter,
  InMemorySearchIndex,
  SearchError,
};

export default SearchAdapters;
