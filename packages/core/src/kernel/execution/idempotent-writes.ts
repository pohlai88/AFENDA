import {
  applyIfNotSeen,
  createPostgresProcessedEntriesStore,
  insertIfNotExists,
  upsertById,
  type IdempotencyStore,
  type PostgresProcessedEntriesStoreOptions,
  type QueryResult,
  type QueryResultRow,
  type SqlClient,
} from "@afenda/contracts";
import type { DbClient } from "@afenda/db";

export type PgQueryClient = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

function hasQueryClient(value: unknown): value is PgQueryClient {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { query?: unknown }).query === "function"
  );
}

function hasDrizzleClient(value: unknown): value is { $client: PgQueryClient } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$client" in value &&
    hasQueryClient((value as { $client: unknown }).$client)
  );
}

/**
 * Resolve a contracts SqlClient from either a pg query client or a Drizzle DbClient.
 */
export function resolveSqlClient(client: DbClient | PgQueryClient): SqlClient {
  if (hasQueryClient(client)) {
    return { query: (sql, params) => client.query(sql, params) };
  }

  if (hasDrizzleClient(client)) {
    return { query: (sql, params) => client.$client.query(sql, params) };
  }

  throw new Error("Unsupported DB client: expected pg query client or drizzle db with $client");
}

export async function upsertByIdWithClient<T extends Record<string, unknown>>(
  client: DbClient | PgQueryClient,
  table: string,
  idCol: string,
  row: Record<string, unknown>,
  updateCols: string[],
): Promise<T> {
  return upsertById<T>(resolveSqlClient(client), table, idCol, row, updateCols);
}

export async function insertIfNotExistsWithClient<T extends Record<string, unknown>>(
  client: DbClient | PgQueryClient,
  table: string,
  idCol: string,
  row: Record<string, unknown>,
): Promise<T> {
  return insertIfNotExists<T>(resolveSqlClient(client), table, idCol, row);
}

export function createPostgresProcessedEntriesStoreFromClient(
  client: DbClient | PgQueryClient,
  opts?: PostgresProcessedEntriesStoreOptions,
): IdempotencyStore {
  return createPostgresProcessedEntriesStore(resolveSqlClient(client), opts);
}

export { applyIfNotSeen };

export type { SqlClient, QueryResult, QueryResultRow, PostgresProcessedEntriesStoreOptions };
