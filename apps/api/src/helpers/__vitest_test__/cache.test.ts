/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { createBoundedCache } from "../cache.js";

describe("createBoundedCache", () => {
  it("should store and retrieve values", () => {
    const cache = createBoundedCache<string, string>(10);
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("should return undefined for missing keys", () => {
    const cache = createBoundedCache<string, string>(10);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("should update existing keys without growing size", () => {
    const cache = createBoundedCache<string, string>(10);
    cache.set("key1", "value1");
    cache.set("key1", "value2");
    expect(cache.get("key1")).toBe("value2");
    expect(cache.size()).toBe(1);
  });

  it("should evict oldest entry when over max size", () => {
    const cache = createBoundedCache<string, string>(3);
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.set("key3", "value3");
    cache.set("key4", "value4"); // Should evict key1

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBe("value2");
    expect(cache.get("key3")).toBe("value3");
    expect(cache.get("key4")).toBe("value4");
    expect(cache.size()).toBe(3);
  });

  it("should move recently accessed items to end (LRU)", () => {
    const cache = createBoundedCache<string, string>(3);
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.set("key3", "value3");

    // Access key1 (moves to end)
    cache.get("key1");

    // Add key4 (should evict key2, not key1)
    cache.set("key4", "value4");

    expect(cache.get("key1")).toBe("value1"); // Still present
    expect(cache.get("key2")).toBeUndefined(); // Evicted
    expect(cache.get("key3")).toBe("value3");
    expect(cache.get("key4")).toBe("value4");
  });

  it("should report correct size", () => {
    const cache = createBoundedCache<string, string>(10);
    expect(cache.size()).toBe(0);

    cache.set("key1", "value1");
    expect(cache.size()).toBe(1);

    cache.set("key2", "value2");
    expect(cache.size()).toBe(2);

    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it("should clear all entries", () => {
    const cache = createBoundedCache<string, string>(10);
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    cache.clear();

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it("should handle numeric keys", () => {
    const cache = createBoundedCache<number, string>(10);
    cache.set(1, "one");
    cache.set(2, "two");

    expect(cache.get(1)).toBe("one");
    expect(cache.get(2)).toBe("two");
  });

  it("should handle max size = 1", () => {
    const cache = createBoundedCache<string, string>(1);
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBe("value2");
    expect(cache.size()).toBe(1);
  });

  it("should use default max size of 1000", () => {
    const cache = createBoundedCache<string, string>();

    // Fill beyond 1000
    for (let i = 0; i < 1100; i++) {
      cache.set(`key${i}`, `value${i}`);
    }

    // Should have evicted first 100 entries
    expect(cache.get("key0")).toBeUndefined();
    expect(cache.get("key99")).toBeUndefined();
    expect(cache.get("key100")).toBe("value100");
    expect(cache.size()).toBe(1000);
  });
});
