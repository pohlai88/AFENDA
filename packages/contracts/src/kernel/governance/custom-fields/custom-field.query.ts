/**
 * Custom fields query schemas — GET response shapes.
 *
 * Two distinct response types:
 *   CustomFieldDefResponseSchema  — returned by definition API (kernel)
 *   CustomFieldValuesResponseSchema — returned by entity-domain reads
 *
 * The entity `customFields` payload is a plain Record<apiKey, JsonValue | null>
 * assembled at read time from custom_field_value rows.
 */
import { z } from "zod";
import { CustomFieldEntityTypeValues, CustomFieldDataTypeValues } from "./custom-field-entity-types.js";
import { JsonValueSchema } from "../../execution/outbox/envelope.js";
import { CustomFieldOptionSchema } from "./custom-field.entity.js";

// ── Definition list response (from GET /v1/custom-fields?entityType=...) ──────

export const CustomFieldDefResponseSchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(CustomFieldEntityTypeValues),
  label: z.string(),
  apiKey: z.string(),
  dataType: z.enum(CustomFieldDataTypeValues),
  optionsJson: z.array(CustomFieldOptionSchema).nullable(),
  required: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number(),
  helpText: z.string().nullable(),
  defaultValueJson: JsonValueSchema.nullable(),
  showInPdf: z.boolean(),
  createdAt: z.string(),
});

export type CustomFieldDefResponse = z.infer<typeof CustomFieldDefResponseSchema>;

// ── Values payload embedded in entity reads ───────────────────────────────────
// Record<apiKey, value | null>  — null means "no value stored; use definition default in UI"

export const CustomFieldValuesResponseSchema = z.record(z.string(), JsonValueSchema.nullable());

export type CustomFieldValuesResponse = z.infer<typeof CustomFieldValuesResponseSchema>;

// ── Query params for listing definitions ──────────────────────────────────────

export const CustomFieldsQueryParamsSchema = z.object({
  entityType: z.enum(CustomFieldEntityTypeValues).optional(),
  includeInactive: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

export type CustomFieldsQueryParams = z.infer<typeof CustomFieldsQueryParamsSchema>;
