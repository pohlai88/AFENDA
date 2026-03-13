/**
 * Settings query schemas — GET request params and response shape.
 *
 * RULES:
 *   1. GET returns *effective* values: system default merged with org overrides.
 *   2. `source: "default"` — value from SETTING_REGISTRY[key].defaultValue.
 *      `source: "stored"`  — org override from org_setting table.
 *   3. Unknown keys in `?keys=` param → 400 CFG_SETTING_KEY_UNKNOWN (not silent).
 *   4. Use an explicit z.object({...}) for Phase 1's 4 known keys rather than a
 *      generic z.record(). Precise per-key serialization errors + clear OpenAPI schema.
 *   5. Secret keys (secret: true in registry) return value: "***" — the source
 *      field still reflects the real storage state.
 */
import { z } from "zod";
import { SettingKeyValues } from "./setting-keys.js";
import { JsonValueSchema } from "../../execution/outbox/envelope.js";

// ── Per-key value shape ───────────────────────────────────────────────────────

export const SettingValueResponseSchema = z.object({
  value: JsonValueSchema,
  source: z.enum(["default", "stored"]),
});

export type SettingValueResponse = z.infer<typeof SettingValueResponseSchema>;

// ── GET query params ──────────────────────────────────────────────────────────

export const SettingsQueryParamsSchema = z.object({
  keys: z
    .string()
    .transform((s) => s.split(",").map((k) => k.trim()))
    .pipe(z.array(z.enum(SettingKeyValues)))
    .optional(),
});

export type SettingsQueryParams = z.infer<typeof SettingsQueryParamsSchema>;

// ── GET response — explicit object for all known keys ─────────────────────────
// Rule: whenever a key is added to SettingKeyValues, add it here too.
// Explicit object (not z.record) gives precise per-key error messages and
// clean OpenAPI schema output. 42 keys is still manageable.

export const SettingsResponseSchema = z.object({
  // Units
  "general.units.weightUnit": SettingValueResponseSchema,
  "general.units.volumeUnit": SettingValueResponseSchema,
  "general.units.lengthUnit": SettingValueResponseSchema,
  // Email
  "general.email.buttonText": SettingValueResponseSchema,
  "general.email.buttonColor": SettingValueResponseSchema,
  "general.email.footerText": SettingValueResponseSchema,
  // Locale
  "general.locale.language": SettingValueResponseSchema,
  "general.locale.timezone": SettingValueResponseSchema,
  "general.locale.dateFormat": SettingValueResponseSchema,
  "general.locale.timeFormat": SettingValueResponseSchema,
  "general.locale.firstDayOfWeek": SettingValueResponseSchema,
  "general.locale.numberFormat": SettingValueResponseSchema,
  // Financial
  "general.financial.fiscalYearStartMonth": SettingValueResponseSchema,
  "general.financial.defaultPaymentTermsDays": SettingValueResponseSchema,
  "general.financial.taxInclusive": SettingValueResponseSchema,
  "general.financial.roundingMode": SettingValueResponseSchema,
  // Company profile
  "general.company.legalName": SettingValueResponseSchema,
  "general.company.tradingName": SettingValueResponseSchema,
  "general.company.taxId": SettingValueResponseSchema,
  "general.company.phone": SettingValueResponseSchema,
  "general.company.website": SettingValueResponseSchema,
  "general.company.industry": SettingValueResponseSchema,
  "general.company.address.street": SettingValueResponseSchema,
  "general.company.address.city": SettingValueResponseSchema,
  "general.company.address.state": SettingValueResponseSchema,
  "general.company.address.postalCode": SettingValueResponseSchema,
  "general.company.address.country": SettingValueResponseSchema,
  // Notifications
  "general.notifications.emailOnApproval": SettingValueResponseSchema,
  "general.notifications.emailOnPayment": SettingValueResponseSchema,
  "general.notifications.emailOnOverdue": SettingValueResponseSchema,
  // Storage
  "general.storage.maxUploadBytes": SettingValueResponseSchema,
  "general.storage.allowedMimeTypes": SettingValueResponseSchema,
  "general.storage.retentionDays": SettingValueResponseSchema,
  // Features
  "features.ap.enabled": SettingValueResponseSchema,
  "features.ar.enabled": SettingValueResponseSchema,
  "features.purchasing.enabled": SettingValueResponseSchema,
  "features.gl.enabled": SettingValueResponseSchema,
  "features.inventory.enabled": SettingValueResponseSchema,
  "features.hr.enabled": SettingValueResponseSchema,
  "features.project.enabled": SettingValueResponseSchema,
  "features.sales.enabled": SettingValueResponseSchema,
  "features.crm.enabled": SettingValueResponseSchema,
  "features.budgets.enabled": SettingValueResponseSchema,
  "features.approvals.enabled": SettingValueResponseSchema,
  "features.multiCurrency.enabled": SettingValueResponseSchema,
});

export type SettingsResponse = z.infer<typeof SettingsResponseSchema>;

// ── PATCH response — slice of updated keys only ───────────────────────────────

export const SettingsSliceResponseSchema = z.record(z.string(), SettingValueResponseSchema);

export type SettingsSliceResponse = z.infer<typeof SettingsSliceResponseSchema>;
