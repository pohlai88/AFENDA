/**
 * FieldType vocabulary — the exhaustive set of data types the UI autogen
 * system recognises.
 *
 * RULES:
 *   1. `FieldTypeValues` is `as const` — import in `@afenda/db` for the
 *      pgEnum; never duplicate the list.
 *   2. Adding a type is safe. Removing or renaming is a BREAKING CHANGE —
 *      deprecate for one major version first.
 *   3. Every field type MUST have a matching FieldKit handler in
 *      `@afenda/ui/field-kit`. The `ui-meta` CI gate enforces this.
 */
import { z } from "zod";

export const FieldTypeValues = [
  "string",
  "int",
  "decimal",
  "money",
  "date",
  "datetime",
  "enum",
  "relation",
  "json",
  "bool",
  "document",
  "percent",
] as const;

export const FieldTypeSchema = z.enum(FieldTypeValues);
export type FieldType = z.infer<typeof FieldTypeSchema>;
