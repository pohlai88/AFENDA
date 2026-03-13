import { z } from "zod";

import {
  IdempotencyKeySchema as KernelIdempotencyKeySchema,
  type IdempotencyKey as KernelIdempotencyKey,
} from "../kernel/execution/idempotency/request-key.js";

/**
 * Shared idempotency key schema.
 * Extends kernel constraints with character whitelist for transport safety.
 */
export const IdempotencyKeySchema = KernelIdempotencyKeySchema.min(8, "idempotency key too short")
  .max(128, "idempotency key too long")
  .regex(/^[A-Za-z0-9\-_.:]+$/, "invalid idempotency key characters");

export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema> & KernelIdempotencyKey;

export type IdempotencyState = { status: "in-progress" | "completed"; result?: unknown };

export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyState | null>;
  set(key: string, value: IdempotencyState, ttlSeconds?: number): Promise<void>;
  setIfNotExists(key: string, value: IdempotencyState, ttlSeconds?: number): Promise<boolean>;
  delete?(key: string): Promise<void>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
      try {
        if (typeof store.delete === "function") {
          await store.delete(key);
        }
      } catch {
        // Ignore cleanup failures to preserve original error.
      }
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
      if (!Object.prototype.hasOwnProperty.call(entry, "result")) {
        throw new Error("idempotency store returned completed without result");
      }
      return entry.result as T;
    }

    await delay(pollIntervalMs);
  }

  throw new Error("idempotency wait timed out");
}

export function createInMemoryIdempotencyStore(): IdempotencyStore {
  const map = new Map<string, IdempotencyState & { expiresAt?: number }>();

  function isExpired(expiresAt?: number): boolean {
    return typeof expiresAt === "number" && Date.now() > expiresAt;
  }

  return {
    async get(key) {
      const entry = map.get(key);
      if (!entry) return null;
      if (isExpired(entry.expiresAt)) {
        map.delete(key);
        return null;
      }
      return { status: entry.status, result: entry.result };
    },
    async set(key, value, ttlSeconds) {
      map.set(key, {
        ...value,
        expiresAt: typeof ttlSeconds === "number" ? Date.now() + ttlSeconds * 1000 : undefined,
      });
    },
    async setIfNotExists(key, value, ttlSeconds) {
      const existing = map.get(key);
      if (existing && !isExpired(existing.expiresAt)) {
        return false;
      }

      map.set(key, {
        ...value,
        expiresAt: typeof ttlSeconds === "number" ? Date.now() + ttlSeconds * 1000 : undefined,
      });
      return true;
    },
    async delete(key) {
      map.delete(key);
    },
  };
}

export const SharedIdempotency = {
  IdempotencyKeySchema,
  ensureIdempotency,
  createInMemoryIdempotencyStore,
};

export default SharedIdempotency;
