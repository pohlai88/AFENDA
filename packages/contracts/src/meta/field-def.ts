/**
 * FieldDef — metadata describing a single field on an entity.
 *
 * RULES:
 *   1. `fieldType` must be one of `FieldTypeValues` — the field-kit maps it
 *      to CellRenderer + FormWidget + FilterOps + ExportAdapter.
 *   2. Transport shape only — no React, no Tailwind, no icon imports.
 *   3. For `enum` fields, the `enumValues` array must be provided.
 *   4. For `relation` fields, `relationEntityKey` points to the target entity.
 *   5. `validationJson` carries extra constraints (min/max/regex) as a
 *      JSON-serialisable record — form widgets read these for UI hints.
 *      Authoritative validation lives in the contracts command schema.
 */
import { z } from "zod";
import { FieldTypeSchema } from "./field-type.js";

export const FieldDefSchema = z.object({
  /** Unique within the entity: `"invoiceNumber"`, `"amountMinor"` */
  fieldKey: z.string().min(1).max(128),

  /** Data type — drives field-kit widget selection */
  fieldType: FieldTypeSchema,

  /** Human label: `"Invoice Number"` */
  label: z.string().min(1).max(128),

  /** Optional help text for tooltips / form descriptions */
  description: z.string().max(512).optional(),

  /** Whether the field is required for form submission display (authoritative check is the command schema) */
  required: z.boolean().default(false),

  /** Whether the field is always read-only (independent of capabilities) */
  readonly: z.boolean().default(false),

  /** Default expression: literal value or reference key */
  defaultExpr: z.string().max(256).optional(),

  /** For `relation` fields: target entity key (e.g. `"supplier.supplier"`) */
  relationEntityKey: z.string().min(1).max(128).optional(),

  /** For `enum` fields: the allowed values */
  enumValues: z.array(z.string().min(1).max(64)).optional(),

  /**
   * Extra validation hints as JSON-serialisable record.
   * Form widgets use these for min/max/regex display.
   * Authoritative validation stays in the contracts command schema.
   */
  validationJson: z.record(z.string(), z.unknown()).optional(),
});

export type FieldDef = z.infer<typeof FieldDefSchema>;

/** Input type — fields with `.default()` are optional. Use when declaring entity metadata. */
export type FieldDefInput = z.input<typeof FieldDefSchema>;
