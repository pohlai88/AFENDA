import { z } from "zod";

import { ensureIdempotency, type IdempotencyStore } from "./idempotency.js";

const SqlIdentifierSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/u, "invalid SQL identifier");

const EntryIdSchema = z
  .string()
  .min(1, "entryId is required")
  .max(128, "entryId too long")
  .regex(/^[A-Za-z0-9\-_.:]+$/, "invalid entryId characters");

function parseIdentifier(value: string, label: string): string {
  try {
    return SqlIdentifierSchema.parse(value);
  } catch {
    throw new Error(`${label} must be a valid SQL identifier`);
  }
}

function asJsonValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((v) => asJsonValue(v));
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      asJsonValue(v),
    ]);
    return Object.fromEntries(entries);
  }
  return value;
}

export type QueryResultRow = Record<string, unknown>;

export type QueryResult = {
  rows: QueryResultRow[];
  rowCount?: number | null;
};

export type SqlClient = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

export async function upsertById<T extends Record<string, unknown>>(
  client: SqlClient,
  table: string,
  idCol: string,
  row: Record<string, unknown>,
  updateCols: string[],
): Promise<T> {
  const safeTable = parseIdentifier(table, "table");
  const safeIdCol = parseIdentifier(idCol, "idCol");

  if (!Object.prototype.hasOwnProperty.call(row, safeIdCol)) {
    throw new Error(`row must include id column: ${safeIdCol}`);
  }

  const cols = Object.keys(row).map((c) => parseIdentifier(c, `row column ${c}`));
  const paramByCol = new Map<string, number>();
  for (let i = 0; i < cols.length; i += 1) {
    paramByCol.set(cols[i] as string, i + 1);
  }

  const resolvedUpdateCols = (
    updateCols.length > 0 ? updateCols : cols.filter((c) => c !== safeIdCol)
  ).map((c) => parseIdentifier(c, `updateCol ${c}`));
  const assignments = resolvedUpdateCols.map((c) => `${c} = EXCLUDED.${c}`).join(", ");

  const insertColsSql = cols.join(", ");
  const valuesSql = cols.map((_, i) => `$${i + 1}`).join(", ");
  const idParam = paramByCol.get(safeIdCol);
  if (!idParam) {
    throw new Error(`unable to resolve id param for ${safeIdCol}`);
  }

  const sql =
    assignments.length > 0
      ? `
      WITH upserted AS (
        INSERT INTO ${safeTable} (${insertColsSql})
        VALUES (${valuesSql})
        ON CONFLICT (${safeIdCol}) DO UPDATE SET ${assignments}
        RETURNING *
      )
      SELECT * FROM upserted
      UNION ALL
      SELECT * FROM ${safeTable} WHERE ${safeIdCol} = $${idParam} AND NOT EXISTS (SELECT 1 FROM upserted)
      LIMIT 1;
    `
      : `
      WITH upserted AS (
        INSERT INTO ${safeTable} (${insertColsSql})
        VALUES (${valuesSql})
        ON CONFLICT (${safeIdCol}) DO NOTHING
        RETURNING *
      )
      SELECT * FROM upserted
      UNION ALL
      SELECT * FROM ${safeTable} WHERE ${safeIdCol} = $${idParam} AND NOT EXISTS (SELECT 1 FROM upserted)
      LIMIT 1;
    `;

  const params = cols.map((c) => row[c]);
  const res = await client.query(sql, params);
  if (!res.rows[0]) {
    throw new Error("upsertById returned no row");
  }
  return res.rows[0] as T;
}

export async function insertIfNotExists<T extends Record<string, unknown>>(
  client: SqlClient,
  table: string,
  idCol: string,
  row: Record<string, unknown>,
): Promise<T> {
  const safeTable = parseIdentifier(table, "table");
  const safeIdCol = parseIdentifier(idCol, "idCol");

  if (!Object.prototype.hasOwnProperty.call(row, safeIdCol)) {
    throw new Error(`row must include id column: ${safeIdCol}`);
  }

  const cols = Object.keys(row).map((c) => parseIdentifier(c, `row column ${c}`));
  const params = cols.map((c) => row[c]);
  const idParam = cols.indexOf(safeIdCol) + 1;
  if (idParam <= 0) {
    throw new Error(`unable to resolve id param for ${safeIdCol}`);
  }

  const valuesSql = cols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `
    WITH ins AS (
      INSERT INTO ${safeTable} (${cols.join(", ")})
      VALUES (${valuesSql})
      ON CONFLICT (${safeIdCol}) DO NOTHING
      RETURNING *
    )
    SELECT * FROM ins
    UNION ALL
    SELECT * FROM ${safeTable} WHERE ${safeIdCol} = $${idParam} AND NOT EXISTS (SELECT 1 FROM ins)
    LIMIT 1;
  `;

  const res = await client.query(sql, params);
  if (!res.rows[0]) {
    throw new Error("insertIfNotExists returned no row");
  }
  return res.rows[0] as T;
}

export async function applyIfNotSeen<T>(
  store: IdempotencyStore,
  entryId: string,
  handler: () => Promise<T>,
  opts?: { ttlSeconds?: number; pollIntervalMs?: number },
): Promise<T> {
  const key = EntryIdSchema.parse(entryId);
  return ensureIdempotency(store, key, handler, opts);
}

export type PostgresProcessedEntriesStoreOptions = {
  tableName?: string;
  entryIdColumn?: string;
  resultColumn?: string;
};

export function createPostgresProcessedEntriesStore(
  client: SqlClient,
  opts?: PostgresProcessedEntriesStoreOptions,
): IdempotencyStore {
  const tableName = parseIdentifier(opts?.tableName ?? "processed_entries", "tableName");
  const entryIdColumn = parseIdentifier(opts?.entryIdColumn ?? "entry_id", "entryIdColumn");
  const resultColumn = parseIdentifier(opts?.resultColumn ?? "result", "resultColumn");

  return {
    async get(key) {
      const sql = `SELECT ${resultColumn} FROM ${tableName} WHERE ${entryIdColumn} = $1 LIMIT 1`;
      const res = await client.query(sql, [key]);
      const row = res.rows[0];
      if (!row) return null;
      const value = row[resultColumn];
      if (value == null) {
        return { status: "in-progress" };
      }
      if (
        value &&
        typeof value === "object" &&
        "status" in (value as Record<string, unknown>) &&
        ((value as Record<string, unknown>).status === "in-progress" ||
          (value as Record<string, unknown>).status === "completed")
      ) {
        return value as { status: "in-progress" | "completed"; result?: unknown };
      }
      return { status: "completed", result: value };
    },
    async set(key, value) {
      const payload =
        value.status === "completed"
          ? { status: "completed", result: asJsonValue(value.result) }
          : null;
      const sql = `
        INSERT INTO ${tableName} (${entryIdColumn}, ${resultColumn})
        VALUES ($1, $2)
        ON CONFLICT (${entryIdColumn}) DO UPDATE SET ${resultColumn} = EXCLUDED.${resultColumn}
      `;
      await client.query(sql, [key, payload]);
    },
    async setIfNotExists(key, value) {
      const payload =
        value.status === "completed"
          ? { status: "completed", result: asJsonValue(value.result) }
          : null;
      const sql = `
        INSERT INTO ${tableName} (${entryIdColumn}, ${resultColumn})
        VALUES ($1, $2)
        ON CONFLICT (${entryIdColumn}) DO NOTHING
        RETURNING ${entryIdColumn}
      `;
      const res = await client.query(sql, [key, payload]);
      return (res.rowCount ?? res.rows.length) > 0;
    },
    async delete(key) {
      const sql = `DELETE FROM ${tableName} WHERE ${entryIdColumn} = $1`;
      await client.query(sql, [key]);
    },
  };
}

export type RedisLikeClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ...args: unknown[]) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
};

export type RedisIdempotencyStoreOptions = {
  keyPrefix?: string;
};

export function createRedisIdempotencyStore(
  client: RedisLikeClient,
  opts?: RedisIdempotencyStoreOptions,
): IdempotencyStore {
  const keyPrefix = opts?.keyPrefix ?? "idempotency";

  function toKey(key: string): string {
    return `${keyPrefix}:${key}`;
  }

  return {
    async get(key) {
      const raw = await client.get(toKey(key));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { status: "in-progress" | "completed"; result?: unknown };
      return parsed;
    },
    async set(key, value, ttlSeconds) {
      const payload = JSON.stringify({ status: value.status, result: asJsonValue(value.result) });
      if (typeof ttlSeconds === "number") {
        await client.set(toKey(key), payload, "EX", ttlSeconds);
        return;
      }
      await client.set(toKey(key), payload);
    },
    async setIfNotExists(key, value, ttlSeconds) {
      const payload = JSON.stringify({ status: value.status, result: asJsonValue(value.result) });
      const ttl = typeof ttlSeconds === "number" ? ttlSeconds : 86400;
      const outcome = await client.set(toKey(key), payload, "NX", "EX", ttl);
      return outcome === "OK" || outcome === true;
    },
    async delete(key) {
      await client.del(toKey(key));
    },
  };
}

export const IdempotentWrites = {
  upsertById,
  insertIfNotExists,
  applyIfNotSeen,
  createPostgresProcessedEntriesStore,
  createRedisIdempotencyStore,
};

export default IdempotentWrites;
