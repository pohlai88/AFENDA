/**
 * Custom field entity type vocabulary — pure `as const` array, no Zod.
 *
 * RULES:
 *   1. Safe to import in @afenda/db — no Zod dependency.
 *   2. Matches PermissionValues / SettingKeyValues pattern.
 *   3. DB column stays `text` (no PG enum type — avoids migration lock on growth).
 *   4. Adding an entity type requires a corresponding entity service integration
 *      (read/write merge) before the type can be used in production.
 *   5. Phase 3 initial vocabulary: supplier, invoice, purchase_order.
 */

export const CustomFieldEntityTypeValues = [
  "supplier",
  "invoice",
  "purchase_order",
] as const;

export type CustomFieldEntityType = (typeof CustomFieldEntityTypeValues)[number];

/**
 * Custom field data type vocabulary.
 *
 * Determines the Zod schema used at write-time validation and the
 * control type rendered in the UI field editor.
 */
export const CustomFieldDataTypeValues = [
  "text",
  "number",
  "date",
  "dropdown",
  "checkbox",
] as const;

export type CustomFieldDataType = (typeof CustomFieldDataTypeValues)[number];
