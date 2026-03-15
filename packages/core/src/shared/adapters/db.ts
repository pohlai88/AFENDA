/**
 * Repository primitives and adapters.
 *
 * Contracts-layer safe by design:
 * - No runtime dependency on pg package in contracts.
 * - PostgresRepository accepts a minimal query-capable client interface.
 */

export class DomainError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code = "DOMAIN_ERROR", details?: unknown) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export type RepoResult<T> = Promise<T | DomainError>;

export type ListOptions = {
  limit?: number;
  offset?: number;
  orderBy?: string;
};

export interface Repository<T> {
  getById(id: string): RepoResult<T | null>;
  list(filter?: Record<string, unknown>, opts?: ListOptions): RepoResult<T[]>;
  create(entity: T): RepoResult<T>;
  update(id: string, patch: Partial<T>): RepoResult<T>;
  delete(id: string): RepoResult<void>;
  bulkUpsert(entities: T[], opts?: { chunkSize?: number }): RepoResult<T[]>;
}

type QueryResultRow = Record<string, unknown>;

type QueryResult = {
  rows: QueryResultRow[];
  rowCount?: number | null;
};

export type QueryClient = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

function validateIdentifier(identifier: string, label: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid ${label}: ${identifier}`);
  }
  return identifier;
}

function placeholders(startIndex: number, count: number): string {
  return Array.from({ length: count }, (_, i) => `$${startIndex + i}`).join(", ");
}

function asSafeOrderBy(orderBy: string): string {
  const trimmed = orderBy.trim();
  const match = /^([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+(ASC|DESC))?$/i.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid orderBy clause: ${orderBy}`);
  }
  const column = validateIdentifier(match[1] as string, "orderBy column");
  const direction = (match[2]?.toUpperCase() ?? "ASC") as "ASC" | "DESC";
  return `${column} ${direction}`;
}

function asPositiveIntOrUndefined(value: number | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be an integer >= 0`);
  }
  return value;
}

export class PostgresRepository<T> implements Repository<T> {
  private readonly client: QueryClient;
  private readonly table: string;
  private readonly idCol: string;
  private readonly columns: string[];
  private readonly writeColumns: string[];
  private readonly rowToEntity: (row: QueryResultRow) => T;
  private readonly entityToRow: (entity: T | Partial<T>) => Record<string, unknown>;

  constructor(opts: {
    client: QueryClient;
    table: string;
    idCol: string;
    columns: string[];
    writeColumns?: string[];
    rowToEntity: (row: QueryResultRow) => T;
    entityToRow: (entity: T | Partial<T>) => Record<string, unknown>;
  }) {
    this.client = opts.client;
    this.table = validateIdentifier(opts.table, "table");
    this.idCol = validateIdentifier(opts.idCol, "id column");
    this.columns = opts.columns.map((c) => validateIdentifier(c, "column"));
    this.writeColumns = (opts.writeColumns ?? opts.columns).map((c) =>
      validateIdentifier(c, "write column"),
    );
    this.rowToEntity = opts.rowToEntity;
    this.entityToRow = opts.entityToRow;

    if (!this.columns.includes(this.idCol)) {
      throw new Error("columns must include idCol");
    }
    if (!this.writeColumns.includes(this.idCol)) {
      throw new Error("writeColumns must include idCol");
    }
  }

  async getById(id: string): RepoResult<T | null> {
    const sql = `SELECT ${this.columns.join(", ")} FROM ${this.table} WHERE ${this.idCol} = $1 LIMIT 1`;
    try {
      const res = await this.client.query(sql, [id]);
      if ((res.rowCount ?? res.rows.length) === 0) {
        return null;
      }
      const row = res.rows[0];
      if (!row) return null;
      return this.rowToEntity(row);
    } catch (error) {
      return new DomainError("DB getById failed", "DB_ERROR", error);
    }
  }

  async list(filter: Record<string, unknown> = {}, opts?: ListOptions): RepoResult<T[]> {
    try {
      const whereParts: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(filter)) {
        const safeKey = validateIdentifier(key, "filter column");
        if (value === null) {
          whereParts.push(`${safeKey} IS NULL`);
          continue;
        }
        whereParts.push(`${safeKey} = $${paramIndex}`);
        params.push(value);
        paramIndex += 1;
      }

      const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
      const orderSql = opts?.orderBy ? `ORDER BY ${asSafeOrderBy(opts.orderBy)}` : "";
      const limit = asPositiveIntOrUndefined(opts?.limit, "limit");
      const offset = asPositiveIntOrUndefined(opts?.offset, "offset");
      const limitSql = limit !== undefined ? `LIMIT ${limit}` : "";
      const offsetSql = offset !== undefined ? `OFFSET ${offset}` : "";

      const sql = `SELECT ${this.columns.join(", ")} FROM ${this.table} ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`;
      const res = await this.client.query(sql, params);
      return res.rows.map((row) => this.rowToEntity(row));
    } catch (error) {
      return new DomainError("DB list failed", "DB_ERROR", error);
    }
  }

  async create(entity: T): RepoResult<T> {
    try {
      const row = this.entityToRow(entity);
      const cols = this.writeColumns;
      const params = cols.map((c) => row[c]);
      const sql = `INSERT INTO ${this.table} (${cols.join(", ")}) VALUES (${placeholders(1, cols.length)}) RETURNING ${this.columns.join(", ")}`;
      const res = await this.client.query(sql, params);
      const created = res.rows[0];
      if (!created) {
        return new DomainError("Create did not return a row", "DB_EMPTY_RESULT");
      }
      return this.rowToEntity(created);
    } catch (error) {
      return new DomainError("DB create failed", "DB_ERROR", error);
    }
  }

  async update(id: string, patch: Partial<T>): RepoResult<T> {
    try {
      const patchRow = this.entityToRow(patch);
      const setCols = this.writeColumns.filter((col) => col !== this.idCol && col in patchRow);
      if (setCols.length === 0) {
        return new DomainError("Empty update patch", "INVALID_INPUT");
      }

      const setSql = setCols.map((col, idx) => `${col} = $${idx + 1}`).join(", ");
      const params = setCols.map((col) => patchRow[col]);
      const idIndex = setCols.length + 1;

      const sql = `UPDATE ${this.table} SET ${setSql} WHERE ${this.idCol} = $${idIndex} RETURNING ${this.columns.join(", ")}`;
      const res = await this.client.query(sql, [...params, id]);
      if ((res.rowCount ?? res.rows.length) === 0) {
        return new DomainError("Not found", "NOT_FOUND");
      }

      const updated = res.rows[0];
      if (!updated) {
        return new DomainError("Update did not return a row", "DB_EMPTY_RESULT");
      }
      return this.rowToEntity(updated);
    } catch (error) {
      return new DomainError("DB update failed", "DB_ERROR", error);
    }
  }

  async delete(id: string): RepoResult<void> {
    try {
      const sql = `DELETE FROM ${this.table} WHERE ${this.idCol} = $1`;
      await this.client.query(sql, [id]);
      return undefined;
    } catch (error) {
      return new DomainError("DB delete failed", "DB_ERROR", error);
    }
  }

  async bulkUpsert(entities: T[], opts?: { chunkSize?: number }): RepoResult<T[]> {
    if (!Array.isArray(entities) || entities.length === 0) {
      return new DomainError("entities must be a non-empty array", "INVALID_INPUT");
    }

    const chunkSize = opts?.chunkSize ?? 200;
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      return new DomainError("chunkSize must be > 0", "INVALID_INPUT");
    }

    try {
      const allRows: T[] = [];
      for (let i = 0; i < entities.length; i += chunkSize) {
        const chunk = entities.slice(i, i + chunkSize);
        const rows = chunk.map((entity) => this.entityToRow(entity));

        const params: unknown[] = [];
        const valuesSql: string[] = [];
        let paramIndex = 1;

        for (const row of rows) {
          const valueGroup = this.writeColumns.map((column) => {
            params.push(row[column]);
            const placeholder = `$${paramIndex}`;
            paramIndex += 1;
            return placeholder;
          });
          valuesSql.push(`(${valueGroup.join(", ")})`);
        }

        const updateCols = this.writeColumns.filter((c) => c !== this.idCol);
        if (updateCols.length === 0) {
          return new DomainError(
            "bulkUpsert requires at least one non-id write column",
            "INVALID_INPUT",
          );
        }
        const updateSql = updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(", ");

        const sql = `
          INSERT INTO ${this.table} (${this.writeColumns.join(", ")})
          VALUES ${valuesSql.join(", ")}
          ON CONFLICT (${this.idCol}) DO UPDATE SET ${updateSql}
          RETURNING ${this.columns.join(", ")}
        `;

        const res = await this.client.query(sql, params);
        for (const row of res.rows) {
          allRows.push(this.rowToEntity(row));
        }
      }

      return allRows;
    } catch (error) {
      return new DomainError("DB bulkUpsert failed", "DB_ERROR", error);
    }
  }
}

export class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  private readonly map = new Map<string, T>();

  async getById(id: string): RepoResult<T | null> {
    try {
      return this.map.get(id) ?? null;
    } catch (error) {
      return new DomainError("InMemory getById failed", "INMEMORY_ERROR", error);
    }
  }

  async list(filter: Record<string, unknown> = {}, opts?: ListOptions): RepoResult<T[]> {
    try {
      let values = Array.from(this.map.values());

      if (Object.keys(filter).length > 0) {
        values = values.filter((entity) =>
          Object.entries(filter).every(([key, value]) => {
            const current = (entity as Record<string, unknown>)[key];
            return current === value;
          }),
        );
      }

      if (opts?.orderBy) {
        const safeOrderBy = asSafeOrderBy(opts.orderBy);
        const [column, direction] = safeOrderBy.split(" ") as [string, "ASC" | "DESC"];
        values = [...values].sort((a, b) => {
          const aVal = (a as Record<string, unknown>)[column];
          const bVal = (b as Record<string, unknown>)[column];
          if (aVal === bVal) return 0;
          if (aVal === undefined || aVal === null) return direction === "ASC" ? -1 : 1;
          if (bVal === undefined || bVal === null) return direction === "ASC" ? 1 : -1;
          return (aVal as string | number | bigint) > (bVal as string | number | bigint)
            ? direction === "ASC"
              ? 1
              : -1
            : direction === "ASC"
              ? -1
              : 1;
        });
      }

      const offset = asPositiveIntOrUndefined(opts?.offset, "offset") ?? 0;
      const limit = asPositiveIntOrUndefined(opts?.limit, "limit") ?? values.length;
      return values.slice(offset, offset + limit);
    } catch (error) {
      return new DomainError("InMemory list failed", "INMEMORY_ERROR", error);
    }
  }

  async create(entity: T): RepoResult<T> {
    try {
      if (this.map.has(entity.id)) {
        return new DomainError("Already exists", "ALREADY_EXISTS");
      }
      this.map.set(entity.id, entity);
      return entity;
    } catch (error) {
      return new DomainError("InMemory create failed", "INMEMORY_ERROR", error);
    }
  }

  async update(id: string, patch: Partial<T>): RepoResult<T> {
    try {
      const existing = this.map.get(id);
      if (!existing) {
        return new DomainError("Not found", "NOT_FOUND");
      }
      const updated = { ...existing, ...patch } as T;
      this.map.set(id, updated);
      return updated;
    } catch (error) {
      return new DomainError("InMemory update failed", "INMEMORY_ERROR", error);
    }
  }

  async delete(id: string): RepoResult<void> {
    try {
      this.map.delete(id);
      return undefined;
    } catch (error) {
      return new DomainError("InMemory delete failed", "INMEMORY_ERROR", error);
    }
  }

  async bulkUpsert(entities: T[]): RepoResult<T[]> {
    try {
      for (const entity of entities) {
        this.map.set(entity.id, entity);
      }
      return [...entities];
    } catch (error) {
      return new DomainError("InMemory bulkUpsert failed", "INMEMORY_ERROR", error);
    }
  }
}

export const DbAdapters = {
  DomainError,
  PostgresRepository,
  InMemoryRepository,
};

export default DbAdapters;
