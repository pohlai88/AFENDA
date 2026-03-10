/**
 * Optimized comparison utilities for performance-sensitive operations
 * 
 * Replaces expensive JSON.stringify comparisons with targeted equality checks.
 * Use for form dirty checking, state comparisons, and re-render optimization.
 */

/**
 * Shallow equality check - compares object references and primitive values
 * Fast O(n) operation where n = number of keys
 * 
 * @example
 * const prev = { name: "Acme", active: true };
 * const next = { name: "Acme", active: true };
 * shallowEqual(prev, next); // false (different objects)
 * 
 * const ref = { name: "Acme" };
 * shallowEqual(ref, ref); // true (same reference)
 */
export function shallowEqual<T extends Record<string, unknown>>(
  objA: T | null | undefined,
  objB: T | null | undefined
): boolean {
  if (objA === objB) return true;
  if (!objA || !objB) return false;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => objA[key] === objB[key]);
}

/**
 * Deep equality check for nested objects
 * Recursively compares all nested properties
 * 
 * More expensive than shallowEqual but still faster than JSON.stringify
 * for typical form data (avoids string serialization overhead)
 * 
 * @example
 * const prev = { company: { name: "Acme", address: { city: "NYC" } } };
 * const next = { company: { name: "Acme", address: { city: "NYC" } } };
 * deepEqual(prev, next); // true
 */
export function deepEqual(objA: unknown, objB: unknown): boolean {
  // Same reference or both null/undefined
  if (objA === objB) return true;

  // One is null/undefined, other isn't
  if (objA == null || objB == null) return false;

  // Different types
  if (typeof objA !== typeof objB) return false;

  // Primitives or functions
  if (typeof objA !== "object") return objA === objB;

  // Arrays
  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) return false;
    return objA.every((item, index) => deepEqual(item, objB[index]));
  }

  // One is array, other isn't
  if (Array.isArray(objA) || Array.isArray(objB)) return false;

  // Objects
  const keysA = Object.keys(objA as Record<string, unknown>);
  const keysB = Object.keys(objB as Record<string, unknown>);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) =>
    deepEqual(
      (objA as Record<string, unknown>)[key],
      (objB as Record<string, unknown>)[key]
    )
  );
}

/**
 * Form-optimized dirty check
 * Compares form state objects efficiently
 * 
 * - Skips undefined values (common in partial form state)
 * - Uses shallow equality for top-level changes
 * - Deep checks nested objects only when needed
 * 
 * @example
 * const saved = { name: "Acme Corp", active: true, metadata: { created: "2024" } };
 * const draft = { name: "Acme Inc", active: true, metadata: { created: "2024" } };
 * isFormDirty(saved, draft); // true (name changed)
 */
export function isFormDirty<T extends Record<string, unknown>>(
  saved: T | null | undefined,
  draft: T | null | undefined
): boolean {
  // Both empty = not dirty
  if (!saved && !draft) return false;

  // One empty, other has data = dirty
  if (!saved || !draft) return true;

  // Check all keys from both objects
  const allKeys = new Set([...Object.keys(saved), ...Object.keys(draft)]);

  for (const key of allKeys) {
    const savedVal = saved[key];
    const draftVal = draft[key];

    // Skip if both undefined
    if (savedVal === undefined && draftVal === undefined) continue;

    // Different if one is undefined
    if (savedVal === undefined || draftVal === undefined) return true;

    // Primitive comparison
    if (typeof savedVal !== "object" || typeof draftVal !== "object") {
      if (savedVal !== draftVal) return true;
      continue;
    }

    // Nested object/array - use deep equality
    if (!deepEqual(savedVal, draftVal)) return true;
  }

  return false;
}
