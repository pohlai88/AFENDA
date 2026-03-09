/**
 * Custom field write commands.
 *
 * RULES:
 *   1. api_key is set at creation and NEVER updated — it is a schema identifier.
 *      PATCH must reject any attempt to change api_key (CFG_CUSTOM_FIELD_KEY_IMMUTABLE).
 *   2. entity_type is also immutable after creation.
 *   3. options_json value entries are immutable after creation (label/sortOrder mutable).
 *   4. required enforcement is prospective — does not backfill historical records.
 */
import { z } from "zod";
import { CustomFieldEntityTypeValues, CustomFieldDataTypeValues } from "./custom-field-entity-types.js";
import { JsonValueSchema } from "../../execution/outbox/envelope.js";
import { CustomFieldOptionSchema, ApiKeySchema } from "./custom-field.entity.js";

// ── Create definition ─────────────────────────────────────────────────────────

export const CreateCustomFieldDefCommandSchema = z.object({
  entityType: z.enum(CustomFieldEntityTypeValues),
  label: z.string().min(1).max(100),
  apiKey: ApiKeySchema,
  dataType: z.enum(CustomFieldDataTypeValues),
  options: z.array(CustomFieldOptionSchema).optional(),
  required: z.boolean().default(false),
  helpText: z.string().max(500).optional(),
  defaultValue: JsonValueSchema.nullable().optional(),
  showInPdf: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export type CreateCustomFieldDefCommand = z.infer<typeof CreateCustomFieldDefCommandSchema>;

// ── Update definition (api_key and entity_type are NOT updatable) ─────────────
//
// apiKey and entityType are accepted by the schema so Zod does not strip them
// silently. Their presence is detected in the service, which throws
// 409 CFG_CUSTOM_FIELD_KEY_IMMUTABLE immediately. This ensures clients get an
// explicit rejection rather than a silent no-op.

const MUTABLE_UPDATE_KEYS = [
  "label",
  "options",
  "required",
  "helpText",
  "defaultValue",
  "showInPdf",
  "sortOrder",
  "active",
] as const;

export const UpdateCustomFieldDefCommandSchema = z
  .object({
    /** Immutable — sending this field returns 409 CFG_CUSTOM_FIELD_KEY_IMMUTABLE. */
    apiKey: z.string().optional(),
    /** Immutable — sending this field returns 409 CFG_CUSTOM_FIELD_KEY_IMMUTABLE. */
    entityType: z.string().optional(),
    label: z.string().min(1).max(100).optional(),
    options: z.array(CustomFieldOptionSchema).optional(),
    required: z.boolean().optional(),
    helpText: z.string().max(500).nullable().optional(),
    defaultValue: JsonValueSchema.nullable().optional(),
    showInPdf: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (v) => {
      // Pass through if immutable fields are provided — service will reject with 409.
      if (v.apiKey !== undefined || v.entityType !== undefined) return true;
      return MUTABLE_UPDATE_KEYS.some((k) => v[k] !== undefined);
    },
    { message: "At least one field must be provided" },
  );

export type UpdateCustomFieldDefCommand = z.infer<typeof UpdateCustomFieldDefCommandSchema>;

// ── Upsert values for an entity instance ─────────────────────────────────────

export const CustomFieldValueEntrySchema = z.object({
  /** Must match an existing definition api_key for the entity type. */
  apiKey: ApiKeySchema,
  /** null = clear the value (field reverts to definition's defaultValueJson in UI). */
  value: JsonValueSchema.nullable(),
});

export const UpsertCustomFieldValuesCommandSchema = z.object({
  values: z.array(CustomFieldValueEntrySchema).min(1).max(100),
});

export type UpsertCustomFieldValuesCommand = z.infer<typeof UpsertCustomFieldValuesCommandSchema>;
