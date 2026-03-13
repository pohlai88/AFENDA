import { describe, expect, it, vi } from "vitest";

import {
  BulkIdsSchema,
  EventEnvelopeSchema,
  InMemoryIdempotencyStore,
  ensureIdempotency,
} from "../conventions";

describe("shared conventions", () => {
  it("runs a handler once for the same idempotency key", async () => {
    const store = new InMemoryIdempotencyStore();
    const handler = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { ok: true };
    });

    const [a, b] = await Promise.all([
      ensureIdempotency(store, "idem-key-1234", handler, { pollIntervalMs: 5 }),
      ensureIdempotency(store, "idem-key-1234", handler, { pollIntervalMs: 5 }),
    ]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
  });

  it("stores a failed state and allows retry after failure TTL", async () => {
    const store = new InMemoryIdempotencyStore();

    await expect(
      ensureIdempotency(
        store,
        "idem-key-5678",
        async () => {
          throw new Error("boom");
        },
        { pollIntervalMs: 5, ttlSeconds: 1 },
      ),
    ).rejects.toThrow("boom");

    await expect(
      ensureIdempotency(store, "idem-key-5678", async () => "ok", {
        pollIntervalMs: 5,
        ttlSeconds: 1,
      }),
    ).rejects.toThrow("previous attempt failed");
  });

  it("enforces unique ids in bulk schema", () => {
    const valid = BulkIdsSchema.safeParse({ ids: ["a", "b"], schemaVersion: "v1" });
    const invalid = BulkIdsSchema.safeParse({ ids: ["a", "a"] });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("validates minimal event envelope", () => {
    const parsed = EventEnvelopeSchema.parse({
      eventId: "8fb95d44-fb49-4daf-a7f9-b410308f87b3",
      topic: "invoice.v1",
      type: "INVOICE.CREATED",
      schemaVersion: "v1",
      occurredAt: new Date().toISOString(),
      payload: { resourceType: "invoice", resourceId: "inv_1" },
      meta: { correlationId: "corr_1", actorId: "actor_1" },
    });

    expect(parsed.topic).toBe("invoice.v1");
    expect(parsed.type).toBe("INVOICE.CREATED");
  });
});
