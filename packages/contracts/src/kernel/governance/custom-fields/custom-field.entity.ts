/**
 * Custom field entity schemas — mirrors the DB tables.
 *
 * Two tables:
 *   custom_field_def   — admin-managed field definitions (governance metadata)
 *   custom_field_value — per-entity-instance values (domain business data)
 *
 * These are separate entities with separate lifecycles. See plan §16.5.
 */
import { z } from "zod";
import { CustomFieldEntityTypeValues, CustomFieldDataTypeValues } from "./custom-field-entity-types.js";
import { JsonValueSchema } from "../../execution/outbox/envelope.js";

// ── Dropdown option shape ─────────────────────────────────────────────────────

export const CustomFieldOptionSchema = z.object({
  value: z.string().min(1),       // stored value — immutable after creation
  label: z.string().min(1),       // display label — mutable
  active: z.boolean().optional(), // default true; false = soft-removed from picker
  sortOrder: z.number().int().optional(),
});

export type CustomFieldOption = z.infer<typeof CustomFieldOptionSchema>;

// ── api_key slug rule ─────────────────────────────────────────────────────────

export const ApiKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,62}$/, "api_key must be a lowercase slug (e.g. ref_code)");

// ── custom_field_def entity ───────────────────────────────────────────────────

export const CustomFieldDefSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  entityType: z.enum(CustomFieldEntityTypeValues),
  label: z.string().min(1).max(100),
  /** Immutable after creation — treated as a schema identifier. */
  apiKey: ApiKeySchema,
  dataType: z.enum(CustomFieldDataTypeValues),
  /** Non-null only when dataType = "dropdown". */
  optionsJson: z.array(CustomFieldOptionSchema).nullable(),
  required: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int(),
  helpText: z.string().max(500).nullable(),
  defaultValueJson: JsonValueSchema.nullable(),
  showInPdf: z.boolean(),
  createdAt: z.string().datetime(),
  createdBy: z.string().uuid().nullable(),
});

export type CustomFieldDef = z.infer<typeof CustomFieldDefSchema>;

// ── custom_field_value entity ─────────────────────────────────────────────────

export const CustomFieldValueSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  fieldDefId: z.string().uuid(),
  entityType: z.enum(CustomFieldEntityTypeValues),
  entityId: z.string().uuid(),
  /** null = no value set (the definition's defaultValueJson applies in UI). */
  valueJson: JsonValueSchema.nullable(),
  updatedAt: z.string().datetime(),
  updatedBy: z.string().uuid().nullable(),
});

export type CustomFieldValue = z.infer<typeof CustomFieldValueSchema>;
