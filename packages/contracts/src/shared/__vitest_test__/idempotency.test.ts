import { describe, expect, it, vi } from "vitest";

import {
  IdempotencyKeySchema,
  createInMemoryIdempotencyStore,
  ensureIdempotency,
} from "../idempotency";

describe("shared idempotency", () => {
  it("validates key characters and length", () => {
    expect(IdempotencyKeySchema.safeParse("abc").success).toBe(false);
    expect(IdempotencyKeySchema.safeParse("valid_key:1234").success).toBe(true);
    expect(IdempotencyKeySchema.safeParse("bad key with spaces").success).toBe(false);
  });

  it("runs handler once and reuses stored result for concurrent callers", async () => {
    const store = createInMemoryIdempotencyStore();
    const handler = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { paymentId: "p_1" };
    });

    const [a, b] = await Promise.all([
      ensureIdempotency(store, "idem-key-0001", handler, { pollIntervalMs: 5 }),
      ensureIdempotency(store, "idem-key-0001", handler, { pollIntervalMs: 5 }),
    ]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ paymentId: "p_1" });
    expect(b).toEqual({ paymentId: "p_1" });
  });

  it("cleans up in-progress key when handler fails", async () => {
    const store = createInMemoryIdempotencyStore();

    await expect(
      ensureIdempotency(
        store,
        "idem-key-0002",
        async () => {
          throw new Error("boom");
        },
        { pollIntervalMs: 5 },
      ),
    ).rejects.toThrow("boom");

    const retry = await ensureIdempotency(store, "idem-key-0002", async () => "ok", {
      pollIntervalMs: 5,
    });

    expect(retry).toBe("ok");
  });
});
