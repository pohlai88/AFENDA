import { describe, expect, it } from "vitest";

import {
  ElasticSearchAdapter,
  type ElasticSearchResponse,
  InMemorySearchIndex,
  PostgresSearchAdapter,
  SearchError,
  type ElasticClientLike,
  type PostgresQueryClient,
} from "../search";

type SearchEntity = {
  id: string;
  orgId: string;
  title: string;
  description?: string;
};

async function* iteratorFrom<T>(values: T[]): AsyncIterable<T> {
  for (const value of values) {
    yield value;
  }
}

describe("adapters/search", () => {
  it("InMemorySearchIndex supports deterministic search and pagination", async () => {
    const index = new InMemorySearchIndex<SearchEntity>();
    await index.index({ id: "a", orgId: "org-1", title: "hello world" });
    await index.index({ id: "b", orgId: "org-1", title: "hello finance" });
    await index.index({ id: "c", orgId: "org-2", title: "goodbye" });

    const results = await index.search({ q: "hello", limit: 2, offset: 0 });

    expect(results).toHaveLength(2);
    expect(results[0]?.id).toBe("a");
    expect(results[1]?.id).toBe("b");

    const filtered = await index.search({ filters: { orgId: "org-2" } });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("c");
  });

  it("PostgresSearchAdapter sends parameterized query and maps results", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const client: PostgresQueryClient = {
      async query(sql, params) {
        calls.push({ sql, params });
        if (sql.includes("SELECT")) {
          return {
            rows: [
              {
                id: "x-1",
                score: 0.9,
                doc: { id: "x-1", orgId: "org-1", title: "invoice report" },
              },
            ],
          };
        }
        return { rows: [] };
      },
    };

    const adapter = new PostgresSearchAdapter<SearchEntity>({
      client,
      table: "search_index",
      documentBuilder: (entity) => ({
        id: entity.id,
        orgId: entity.orgId,
        title: entity.title,
      }),
      textExtractor: (entity) => `${entity.title} ${entity.description ?? ""}`,
    });

    await adapter.index({
      id: "x-1",
      orgId: "org-1",
      title: "invoice report",
      description: "monthly",
    });

    const results = await adapter.search({
      q: "invoice",
      filters: { orgId: "org-1" },
      limit: 10,
      offset: 0,
    });

    expect(calls.some((c) => c.sql.includes("to_tsvector('simple'"))).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("x-1");
    expect(results[0]?.score).toBe(0.9);
  });

  it("ElasticSearchAdapter maps hit payloads", async () => {
    const client: ElasticClientLike = {
      async index() {
        return {};
      },
      async delete() {
        return {};
      },
      async search<T>() {
        return {
          hits: {
            hits: [
              {
                _id: "e-1",
                _score: 1.2,
                _source: { id: "e-1", orgId: "org-1", title: "cashflow" },
              },
            ],
          },
        } as ElasticSearchResponse<T>;
      },
    };

    const adapter = new ElasticSearchAdapter<SearchEntity>({
      client,
      index: "search-index",
      documentBuilder: (entity) => ({ id: entity.id, title: entity.title, orgId: entity.orgId }),
    });

    const results = await adapter.search({ q: "cashflow" });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("e-1");
    expect(results[0]?.score).toBe(1.2);
  });

  it("PostgresSearchAdapter throws SearchError on invalid filter key", async () => {
    const client: PostgresQueryClient = {
      async query() {
        return { rows: [] };
      },
    };

    const adapter = new PostgresSearchAdapter<SearchEntity>({
      client,
      table: "search_index",
      documentBuilder: (entity) => ({ id: entity.id, title: entity.title, orgId: entity.orgId }),
      textExtractor: (entity) => entity.title,
    });

    await expect(
      adapter.search({
        filters: { "orgId; DROP TABLE users": "org-1" },
      }),
    ).rejects.toBeInstanceOf(SearchError);
  });

  it("reindexAll replaces in-memory dataset", async () => {
    const index = new InMemorySearchIndex<SearchEntity>();
    await index.index({ id: "x", orgId: "org-1", title: "legacy" });

    await index.reindexAll(
      iteratorFrom([
        { id: "n1", orgId: "org-1", title: "new one" },
        { id: "n2", orgId: "org-2", title: "new two" },
      ]),
    );

    const all = await index.search({});
    expect(all).toHaveLength(2);
    expect(all.map((x) => x.id)).toEqual(["n1", "n2"]);
  });
});
