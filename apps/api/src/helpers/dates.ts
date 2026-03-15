/**
 * Date serialization utilities for API response formatting.
 *
 * RULES:
 * - All Date objects in API responses must be ISO 8601 strings
 * - Use these helpers to ensure consistent formatting
 * - Handles null/undefined gracefully
 */

/**
 * Serialize a Date to ISO 8601 string or null.
 *
 * @param date Date object, string, or null/undefined
 * @returns ISO 8601 string or null
 *
 * @example
 * serializeDate(new Date()) // "2026-03-14T10:30:00.000Z"
 * serializeDate(null) // null
 * serializeDate(undefined) // null
 */
export function serializeDate(date: Date | string | null | undefined): string | null {
  if (date == null) return null;
  if (date instanceof Date) return date.toISOString();
  // Already a string (from DB JSON columns or pre-serialized)
  return date;
}

/**
 * Serialize a required Date to ISO 8601 string.
 * Throws if date is null/undefined.
 *
 * @param date Date object or string
 * @returns ISO 8601 string
 *
 * @example
 * serializeDateRequired(new Date()) // "2026-03-14T10:30:00.000Z"
 * serializeDateRequired(null) // throws Error
 */
export function serializeDateRequired(date: Date | string): string {
  if (date === null || date === undefined) {
    throw new Error("Required date field is null/undefined");
  }
  if (date instanceof Date) return date.toISOString();
  return date;
}

/**
 * Serialize multiple date fields in a row object.
 * Currying pattern for repeated use on arrays.
 *
 * @param fields Array of field names to serialize
 * @returns Transform function for rows
 *
 * @example
 * const rows = await db.query.invoice.findMany();
 * const serialized = rows.map(serializeDates(['createdAt', 'updatedAt']));
 */
export function serializeDates<T extends Record<string, any>>(fields: (keyof T)[]) {
  return (row: T): T => {
    const result = { ...row };
    for (const field of fields) {
      const value = result[field] as unknown;
      if (value instanceof Date) {
        (result[field] as any) = value.toISOString();
      } else if (value === null || value === undefined) {
        (result[field] as any) = null;
      }
    }
    return result;
  };
}
