/**
 * In-memory idempotency store for Neon Auth webhook event_id.
 * For production multi-instance, replace with Redis or DB.
 * Ref: docs/neon.webhook.md — Idempotency
 */

const MAX_ENTRIES = 10_000;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface Entry {
  response: { status: number; body: unknown };
  expiresAt: number;
}

const store = new Map<string, Entry>();
let lastPrune = Date.now();
const PRUNE_INTERVAL_MS = 60_000;

function prune() {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [id, entry] of store.entries()) {
    if (entry.expiresAt < now) store.delete(id);
  }
  if (store.size > MAX_ENTRIES) {
    const entries = [...store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toDelete = entries.slice(0, store.size - MAX_ENTRIES);
    for (const [id] of toDelete) store.delete(id);
  }
}

/**
 * Get cached response for event_id (for retries). Returns undefined if not found.
 */
export function getIdempotentResponse(eventId: string): { status: number; body: unknown } | undefined {
  prune();
  const entry = store.get(eventId);
  if (!entry || entry.expiresAt < Date.now()) return undefined;
  return entry.response;
}

/**
 * Cache response for event_id so retries get the same response.
 */
export function setIdempotentResponse(
  eventId: string,
  response: { status: number; body: unknown },
): void {
  prune();
  store.set(eventId, {
    response,
    expiresAt: Date.now() + TTL_MS,
  });
}
