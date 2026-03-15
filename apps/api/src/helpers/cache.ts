/**
 * Bounded cache with LRU eviction for org slug → UUID resolution.
 * Prevents unbounded memory growth in long-lived API processes.
 *
 * RULES:
 * - Max size: 1000 entries (covers most deployments)
 * - Eviction strategy: LRU (Least Recently Used)
 * - Thread-safe for single-threaded Node.js event loop
 */

export interface BoundedCache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  clear(): void;
  size(): number;
}

/**
 * Create a bounded LRU cache.
 *
 * @param maxSize Maximum number of entries (default: 1000)
 * @returns BoundedCache instance
 *
 * @example
 * const orgCache = createBoundedCache<string, string>(1000);
 * orgCache.set("demo", "uuid-123");
 * const id = orgCache.get("demo");
 */
export function createBoundedCache<K, V>(maxSize: number = 1000): BoundedCache<K, V> {
  const cache = new Map<K, V>();

  return {
    get(key: K): V | undefined {
      const value = cache.get(key);
      if (value !== undefined) {
        // Move to end (LRU: most recently used)
        cache.delete(key);
        cache.set(key, value);
      }
      return value;
    },

    set(key: K, value: V): void {
      // If exists, delete first to update position
      if (cache.has(key)) {
        cache.delete(key);
      }

      cache.set(key, value);

      // Evict oldest entry if over limit
      if (cache.size > maxSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }
    },

    has(key: K): boolean {
      return cache.has(key);
    },

    clear(): void {
      cache.clear();
    },

    size(): number {
      return cache.size;
    },
  };
}
