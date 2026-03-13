import { z } from "zod";

import { IdempotencyKeySchema } from "./idempotency.js";

export const Limits = {
  BULK_MAX: 200,
  TEXT_MAX: 20_000,
  IDEMPOTENCY_MIN: 8,
  IDEMPOTENCY_MAX: 128,
} as const;

export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;

export type IdempotencyEntry = {
  key: string;
  status: "in-progress" | "completed" | "failed";
  result?: unknown;
  createdAt?: string;
  expiresAt?: string;
};

export interface IdempotencyStore {
  setIfNotExists(
    key: string,
    value: { status: "in-progress" },
    ttlSeconds?: number,
  ): Promise<boolean>;
  set(
    key: string,
    value: { status: "completed" | "failed"; result?: unknown },
    ttlSeconds?: number,
  ): Promise<void>;
  get(key: string): Promise<IdempotencyEntry | null>;
  delete?(key: string): Promise<void>;
}

export type SqlClient = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
};

const SqlIdentifierSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "invalid SQL identifier");

function parseIdentifier(value: string, label: string): string {
  try {
    return SqlIdentifierSchema.parse(value);
  } catch {
    throw new Error(`${label} must be a valid SQL identifier`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class PostgresIdempotencyStore implements IdempotencyStore {
  private readonly client: SqlClient;

  private readonly table: string;

  constructor(client: SqlClient, table = "idempotency") {
    this.client = client;
    this.table = parseIdentifier(table, "table");
  }

  async setIfNotExists(key: string, value: { status: "in-progress" }, ttlSeconds = 24 * 3600) {
    const sql = `
      INSERT INTO ${this.table} (key, status, result, created_at, expires_at)
      VALUES ($1, $2, NULL, now(), now() + ($3 || ' seconds')::interval)
      ON CONFLICT (key) DO NOTHING
      RETURNING key
    `;
    const res = await this.client.query(sql, [key, value.status, ttlSeconds]);
    return (res.rowCount ?? res.rows.length) > 0;
  }

  async set(
    key: string,
    value: { status: "completed" | "failed"; result?: unknown },
    ttlSeconds = 24 * 3600,
  ) {
    const sql = `
      INSERT INTO ${this.table} (key, status, result, created_at, expires_at)
      VALUES ($1, $2, $3::jsonb, now(), now() + ($4 || ' seconds')::interval)
      ON CONFLICT (key) DO UPDATE
      SET status = EXCLUDED.status,
          result = EXCLUDED.result,
          expires_at = EXCLUDED.expires_at
    `;
    await this.client.query(sql, [
      key,
      value.status,
      JSON.stringify(value.result ?? null),
      ttlSeconds,
    ]);
  }

  async get(key: string): Promise<IdempotencyEntry | null> {
    const sql = `
      SELECT key, status, result, created_at, expires_at
      FROM ${this.table}
      WHERE key = $1
      LIMIT 1
    `;
    const res = await this.client.query(sql, [key]);
    if ((res.rowCount ?? res.rows.length) === 0) return null;

    const row = res.rows[0] ?? null;
    if (!row) return null;

    const createdAt = row.created_at;
    const expiresAt = row.expires_at;
    const status = row.status;

    const normalizedStatus: IdempotencyEntry["status"] =
      status === "completed" || status === "failed" ? status : "in-progress";

    return {
      key: String(row.key ?? key),
      status: normalizedStatus,
      result: row.result,
      createdAt:
        typeof createdAt === "string"
          ? createdAt
          : createdAt instanceof Date
            ? createdAt.toISOString()
            : undefined,
      expiresAt:
        typeof expiresAt === "string"
          ? expiresAt
          : expiresAt instanceof Date
            ? expiresAt.toISOString()
            : undefined,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.query(`DELETE FROM ${this.table} WHERE key = $1`, [key]);
  }
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<string, IdempotencyEntry & { expiresAtMs?: number }>();

  private isExpired(entry: { expiresAtMs?: number } | undefined): boolean {
    return typeof entry?.expiresAtMs === "number" && Date.now() > entry.expiresAtMs;
  }

  async setIfNotExists(key: string, value: { status: "in-progress" }, ttlSeconds = 24 * 3600) {
    const existing = this.map.get(key);
    if (existing && !this.isExpired(existing)) return false;

    const now = new Date();
    const expiresAtMs = now.getTime() + ttlSeconds * 1000;

    this.map.set(key, {
      key,
      status: value.status,
      createdAt: now.toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      expiresAtMs,
    });
    return true;
  }

  async set(
    key: string,
    value: { status: "completed" | "failed"; result?: unknown },
    ttlSeconds = 24 * 3600,
  ) {
    const now = new Date();
    const expiresAtMs = now.getTime() + ttlSeconds * 1000;

    this.map.set(key, {
      key,
      status: value.status,
      result: value.result,
      createdAt: now.toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      expiresAtMs,
    });
  }

  async get(key: string): Promise<IdempotencyEntry | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.map.delete(key);
      return null;
    }
    const { expiresAtMs: _ignored, ...safe } = entry;
    return safe;
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}

export async function ensureIdempotency<T>(
  store: IdempotencyStore,
  idempotencyKey: unknown,
  handler: () => Promise<T>,
  opts?: { ttlSeconds?: number; pollIntervalMs?: number },
): Promise<T> {
  const key = IdempotencyKeySchema.parse(idempotencyKey);
  const ttlSeconds = opts?.ttlSeconds ?? 60 * 60 * 24;
  const pollIntervalMs = opts?.pollIntervalMs ?? 200;

  const claimed = await store.setIfNotExists(key, { status: "in-progress" }, ttlSeconds);
  if (claimed) {
    try {
      const result = await handler();
      await store.set(key, { status: "completed", result }, ttlSeconds);
      return result;
    } catch (error) {
      await store.set(
        key,
        {
          status: "failed",
          result: { error: String(error) },
        },
        Math.min(ttlSeconds, 60),
      );
      throw error;
    }
  }

  const start = Date.now();
  while (Date.now() - start < ttlSeconds * 1000) {
    const entry = await store.get(key);
    if (!entry) {
      await delay(pollIntervalMs);
      continue;
    }

    if (entry.status === "completed") {
      return entry.result as T;
    }

    if (entry.status === "failed") {
      throw new Error("previous attempt failed");
    }

    await delay(pollIntervalMs);
  }

  throw new Error("idempotency wait timed out");
}

export const BulkIdsSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(Limits.BULK_MAX),
    schemaVersion: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const unique = new Set(value.ids);
    if (unique.size !== value.ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ids must be unique",
        path: ["ids"],
      });
    }
  });

export type BulkIds = z.infer<typeof BulkIdsSchema>;

export const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  topic: z.string().min(1),
  type: z.string().min(1),
  schemaVersion: z.string().optional(),
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export const SharedConventions = {
  Limits,
  IdempotencyKeySchema,
  PostgresIdempotencyStore,
  InMemoryIdempotencyStore,
  ensureIdempotency,
  BulkIdsSchema,
  EventEnvelopeSchema,
};

export default SharedConventions;
