import { describe, expect, it } from "vitest";

import {
  EventBusError,
  InMemoryEventBus,
  PostgresEventBus,
  RedisEventBus,
  type EventEnvelope,
  type PostgresPoolLike,
  type RedisClientLike,
  type RedisSubscriberLike,
} from "../event-bus";

function makeEnvelope(eventId: string, topic = "comm.events"): EventEnvelope {
  return {
    eventId,
    topic,
    type: "ENTITY_CREATED",
    occurredAt: "2026-03-13T00:00:00.000Z",
    payload: { id: "x1" },
    meta: { correlationId: "c1" },
  };
}

describe("adapters/event-bus", () => {
  it("InMemoryEventBus dedupes by eventId for subscribed handlers", async () => {
    const bus = new InMemoryEventBus();
    const seen: string[] = [];

    await bus.subscribe("comm.events", async (envelope) => {
      seen.push(envelope.eventId);
    });

    await bus.publish(makeEnvelope("evt-1"));
    await bus.publish(makeEnvelope("evt-1"));

    expect(seen).toEqual(["evt-1"]);
  });

  it("PostgresEventBus publish inserts outbox row", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];

    const pool: PostgresPoolLike = {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [], rowCount: 1 };
      },
      async connect() {
        return {
          async query(sql, params) {
            calls.push({ sql, params });
            return { rows: [], rowCount: 0 };
          },
          release() {
            return;
          },
        };
      },
    };

    const bus = new PostgresEventBus({
      pool,
      outboxTable: "outbox",
      processedTable: "processed_events",
    });

    await bus.publish(makeEnvelope("evt-2"));

    expect(calls[0]?.sql).toContain("INSERT INTO outbox");
    expect(calls[0]?.params?.[0]).toBe("evt-2");
  });

  it("PostgresEventBus publishTransactional requires tx client", async () => {
    const pool: PostgresPoolLike = {
      async query() {
        return { rows: [], rowCount: 0 };
      },
      async connect() {
        return {
          async query() {
            return { rows: [], rowCount: 0 };
          },
          release() {
            return;
          },
        };
      },
    };

    const bus = new PostgresEventBus({ pool });
    await expect(bus.publishTransactional(makeEnvelope("evt-3"), undefined)).rejects.toBeInstanceOf(
      EventBusError,
    );
  });

  it("RedisEventBus subscribes and dedupes with NX key claim", async () => {
    let listener: ((message: string) => Promise<void> | void) | undefined;
    const dedupe = new Set<string>();

    const sub: RedisSubscriberLike = {
      async connect() {
        return;
      },
      async subscribe(_topic, handler) {
        listener = handler;
      },
      async unsubscribe() {
        return;
      },
      async disconnect() {
        return;
      },
    };

    const client: RedisClientLike = {
      async publish(_topic, payload) {
        await listener?.(payload);
        return 1;
      },
      async set(key, _value, options) {
        if (options?.NX) {
          if (dedupe.has(key)) return null;
          dedupe.add(key);
          return "OK";
        }
        dedupe.add(key);
        return "OK";
      },
      async get(key) {
        return dedupe.has(key) ? "1" : null;
      },
      duplicate() {
        return sub;
      },
    };

    const bus = new RedisEventBus({ client, dedupePrefix: "dedupe:", dedupeTtlSeconds: 60 });

    const seen: string[] = [];
    await bus.subscribe("comm.events", async (envelope) => {
      seen.push(envelope.eventId);
    });

    await bus.publish(makeEnvelope("evt-4"));
    await bus.publish(makeEnvelope("evt-4"));

    expect(seen).toEqual(["evt-4"]);
  });
});
