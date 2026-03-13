export type EventEnvelope<P = unknown> = {
  eventId: string;
  topic: string;
  type: string;
  occurredAt: string;
  payload: P;
  meta?: Record<string, unknown>;
};

export class EventBusError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code = "EVENT_BUS_ERROR", details?: unknown) {
    super(message);
    this.name = "EventBusError";
    this.code = code;
    this.details = details;
  }
}

export interface EventBus {
  publish<P = unknown>(envelope: EventEnvelope<P>): Promise<void>;
  subscribe<P = unknown>(
    topic: string,
    handler: (envelope: EventEnvelope<P>) => Promise<void>,
  ): Promise<() => Promise<void>>;
  publishTransactional<P = unknown>(envelope: EventEnvelope<P>, tx: unknown): Promise<void>;
}

type QueryResultRow = Record<string, unknown>;

type QueryResult = {
  rows: QueryResultRow[];
  rowCount?: number | null;
};

export type PostgresTxClient = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

export type PostgresPooledClient = PostgresTxClient & {
  release: () => void;
};

export type PostgresPoolLike = PostgresTxClient & {
  connect: () => Promise<PostgresPooledClient>;
};

export type RedisSetOptions = {
  NX?: boolean;
  EX?: number;
};

export type RedisSubscriberLike = {
  connect: () => Promise<void>;
  subscribe: (topic: string, listener: (message: string) => void | Promise<void>) => Promise<void>;
  unsubscribe: (topic: string) => Promise<void>;
  disconnect: () => Promise<void>;
};

export type RedisClientLike = {
  publish: (topic: string, payload: string) => Promise<unknown>;
  set: (key: string, value: string, options?: RedisSetOptions) => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  duplicate: () => RedisSubscriberLike;
};

function validateIdentifier(identifier: string, label: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid ${label}: ${identifier}`);
  }
  return identifier;
}

function parseEnvelopeRow<P>(row: QueryResultRow): EventEnvelope<P> {
  const occurredRaw = row.occurred_at;
  const occurredAt = new Date(String(occurredRaw)).toISOString();
  return {
    eventId: String(row.id),
    topic: String(row.topic),
    type: String(row.type),
    occurredAt,
    payload: (row.payload ?? {}) as P,
    meta: (row.meta as Record<string, unknown> | null) ?? {},
  };
}

export class PostgresEventBus implements EventBus {
  private readonly pool: PostgresPoolLike;
  private readonly outboxTable: string;
  private readonly processedTable: string;
  private readonly useNotify: boolean;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;

  constructor(opts: {
    pool: PostgresPoolLike;
    outboxTable?: string;
    processedTable?: string;
    useNotify?: boolean;
    pollIntervalMs?: number;
    batchSize?: number;
  }) {
    this.pool = opts.pool;
    this.outboxTable = validateIdentifier(opts.outboxTable ?? "outbox", "outbox table");
    this.processedTable = validateIdentifier(
      opts.processedTable ?? "processed_events",
      "processed table",
    );
    this.useNotify = opts.useNotify ?? false;
    this.pollIntervalMs = opts.pollIntervalMs ?? 1000;
    this.batchSize = opts.batchSize ?? 50;
  }

  async publish<P = unknown>(envelope: EventEnvelope<P>): Promise<void> {
    const sql = `
      INSERT INTO ${this.outboxTable} (id, topic, type, occurred_at, payload, meta, published)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, false)
      ON CONFLICT (id) DO NOTHING
    `;

    try {
      await this.pool.query(sql, [
        envelope.eventId,
        envelope.topic,
        envelope.type,
        envelope.occurredAt,
        JSON.stringify(envelope.payload ?? {}),
        JSON.stringify(envelope.meta ?? {}),
      ]);

      if (this.useNotify) {
        try {
          const channel = validateIdentifier(this.outboxTable, "notify channel");
          await this.pool.query(`SELECT pg_notify($1, $2)`, [channel, envelope.eventId]);
        } catch {
          // best-effort wake-up notification only
        }
      }
    } catch (error) {
      throw new EventBusError("Postgres publish failed", "PG_PUBLISH_ERROR", error);
    }
  }

  async publishTransactional<P = unknown>(envelope: EventEnvelope<P>, tx: unknown): Promise<void> {
    const txClient = tx as PostgresTxClient | undefined;
    if (!txClient || typeof txClient.query !== "function") {
      throw new EventBusError("Missing transaction client", "INVALID_ARG");
    }

    const sql = `
      INSERT INTO ${this.outboxTable} (id, topic, type, occurred_at, payload, meta, published)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, false)
      ON CONFLICT (id) DO NOTHING
    `;

    try {
      await txClient.query(sql, [
        envelope.eventId,
        envelope.topic,
        envelope.type,
        envelope.occurredAt,
        JSON.stringify(envelope.payload ?? {}),
        JSON.stringify(envelope.meta ?? {}),
      ]);
    } catch (error) {
      throw new EventBusError("Postgres publishTransactional failed", "PG_PUB_TX_ERROR", error);
    }
  }

  async subscribe<P = unknown>(
    topic: string,
    handler: (envelope: EventEnvelope<P>) => Promise<void>,
  ): Promise<() => Promise<void>> {
    let stopped = false;

    const tick = async () => {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");

        const fetchSql = `
          SELECT id, topic, type, occurred_at, payload, meta
          FROM ${this.outboxTable}
          WHERE topic = $1 AND published = false
          ORDER BY created_at
          LIMIT ${this.batchSize}
          FOR UPDATE SKIP LOCKED
        `;

        const fetched = await client.query(fetchSql, [topic]);

        for (const row of fetched.rows) {
          const envelope = parseEnvelopeRow<P>(row);
          const check = await client.query(
            `SELECT event_id FROM ${this.processedTable} WHERE event_id = $1 LIMIT 1`,
            [envelope.eventId],
          );

          if ((check.rowCount ?? check.rows.length) > 0) {
            await client.query(`UPDATE ${this.outboxTable} SET published = true WHERE id = $1`, [
              envelope.eventId,
            ]);
            continue;
          }

          try {
            await handler(envelope);
            await client.query(
              `INSERT INTO ${this.processedTable} (event_id) VALUES ($1) ON CONFLICT DO NOTHING`,
              [envelope.eventId],
            );
            await client.query(`UPDATE ${this.outboxTable} SET published = true WHERE id = $1`, [
              envelope.eventId,
            ]);
          } catch {
            // leave row unpublished for retry on next poll
          }
        }

        await client.query("COMMIT");
      } catch {
        try {
          await client.query("ROLLBACK");
        } catch {
          // ignore rollback failure
        }
      } finally {
        client.release();
      }
    };

    const run = async () => {
      while (!stopped) {
        try {
          await tick();
        } catch {
          // polling is best effort; retry on next interval
        }
        await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      }
    };

    void run();

    return async () => {
      stopped = true;
    };
  }
}

export class RedisEventBus implements EventBus {
  private readonly client: RedisClientLike;
  private readonly dedupePrefix: string;
  private readonly dedupeTtlSeconds: number;

  constructor(opts: { client: RedisClientLike; dedupePrefix?: string; dedupeTtlSeconds?: number }) {
    this.client = opts.client;
    this.dedupePrefix = opts.dedupePrefix ?? "eventbus:dedupe:";
    this.dedupeTtlSeconds = opts.dedupeTtlSeconds ?? 86400;
  }

  private dedupeKey(eventId: string): string {
    return `${this.dedupePrefix}${eventId}`;
  }

  async publish<P = unknown>(envelope: EventEnvelope<P>): Promise<void> {
    try {
      await this.client.publish(envelope.topic, JSON.stringify(envelope));
    } catch (error) {
      throw new EventBusError("Redis publish failed", "REDIS_PUBLISH_ERROR", error);
    }
  }

  async publishTransactional<P = unknown>(
    _envelope: EventEnvelope<P>,
    _tx: unknown,
  ): Promise<void> {
    throw new EventBusError(
      "Redis publishTransactional unsupported; use Postgres outbox for transactional publishes",
      "UNSUPPORTED",
    );
  }

  async subscribe<P = unknown>(
    topic: string,
    handler: (envelope: EventEnvelope<P>) => Promise<void>,
  ): Promise<() => Promise<void>> {
    const sub = this.client.duplicate();
    await sub.connect();

    await sub.subscribe(topic, async (message) => {
      try {
        const envelope = JSON.parse(message) as EventEnvelope<P>;
        const key = this.dedupeKey(envelope.eventId);

        const claimed = await this.client.set(key, "1", {
          NX: true,
          EX: this.dedupeTtlSeconds,
        });

        if (!claimed) {
          return;
        }

        await handler(envelope);
      } catch {
        // ignore malformed messages and transient handler failures
      }
    });

    return async () => {
      try {
        await sub.unsubscribe(topic);
      } finally {
        await sub.disconnect();
      }
    };
  }
}

export class InMemoryEventBus implements EventBus {
  private readonly subscribers = new Map<string, Set<(envelope: EventEnvelope) => Promise<void>>>();
  private readonly processedEventIds = new Set<string>();

  async publish<P = unknown>(envelope: EventEnvelope<P>): Promise<void> {
    const handlers = this.subscribers.get(envelope.topic);
    if (!handlers || handlers.size === 0) {
      return;
    }

    for (const handler of handlers) {
      try {
        await handler(envelope as EventEnvelope);
      } catch {
        // at-least-once semantics: continue delivering to other handlers
      }
    }
  }

  async publishTransactional<P = unknown>(
    _envelope: EventEnvelope<P>,
    _tx: unknown,
  ): Promise<void> {
    throw new EventBusError(
      "InMemory publishTransactional unsupported; call publish after simulated commit",
      "UNSUPPORTED",
    );
  }

  async subscribe<P = unknown>(
    topic: string,
    handler: (envelope: EventEnvelope<P>) => Promise<void>,
  ): Promise<() => Promise<void>> {
    const wrapped = async (envelope: EventEnvelope) => {
      if (this.processedEventIds.has(envelope.eventId)) {
        return;
      }
      await handler(envelope as EventEnvelope<P>);
      this.processedEventIds.add(envelope.eventId);
    };

    const handlers = this.subscribers.get(topic) ?? new Set();
    handlers.add(wrapped);
    this.subscribers.set(topic, handlers);

    return async () => {
      handlers.delete(wrapped);
      if (handlers.size === 0) {
        this.subscribers.delete(topic);
      }
    };
  }

  markProcessed(eventId: string): void {
    this.processedEventIds.add(eventId);
  }
}

export const EventBusAdapters = {
  PostgresEventBus,
  RedisEventBus,
  InMemoryEventBus,
  EventBusError,
};

export default EventBusAdapters;
