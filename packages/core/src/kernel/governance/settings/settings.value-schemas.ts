/**
 * Per-key Zod value schemas — validation executed before any DB write.
 *
 * Distinct from the registry (metadata) and setting-keys (vocabulary).
 * Read at write time only: unknown key → CFG_SETTING_KEY_UNKNOWN,
 * failed schema parse → CFG_SETTING_INVALID_VALUE.
 */
import { z } from "zod";
import type { SettingKey } from "@afenda/contracts";

const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color e.g. #rrggbb");

const MimeTypeTokenSchema = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/;

const MimeTypeAllowListSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine((value) => {
    const tokens = value
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean);

    return tokens.length > 0 && tokens.every((token) => MimeTypeTokenSchema.test(token));
  }, "Must be a comma-separated list of MIME types (e.g. application/pdf,image/png)");

// ── Curated IANA timezone list ─────────────────────────────────────────────────
// Major global business regions only — not a universal IANA claim.
// Both backend validation and UI select use the same list (no divergence).
const SUPPORTED_TIMEZONES = [
  "UTC",
  // North America
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  // Canada & Mexico
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  // South America
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  // Europe
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Helsinki",
  "Europe/Warsaw",
  "Europe/Prague",
  "Europe/Bucharest",
  "Europe/Istanbul",
  "Europe/Moscow",
  // Africa & Middle East
  "Africa/Cairo",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  // Asia
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Jakarta",
  // Oceania
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
] as const;

export const SETTING_VALUE_SCHEMAS: Record<SettingKey, z.ZodTypeAny> = {
  // ── Units ───────────────────────────────────────────────────────────────────
  "general.units.weightUnit": z.enum(["kg", "lb"]),
  "general.units.volumeUnit": z.enum(["m3", "ft3"]),
  "general.units.lengthUnit": z.enum(["m", "ft", "in", "cm", "mm"]),

  // ── Email ────────────────────────────────────────────────────────────────────
  "general.email.buttonText": z.string().trim().min(1).max(80),
  "general.email.buttonColor": HexColorSchema,
  "general.email.footerText": z.string().max(500),

  // ── Locale ───────────────────────────────────────────────────────────────────
  // language     = UI language code (ISO 639-1). Distinct from numberFormat.
  // timezone     = Curated IANA zone (see SUPPORTED_TIMEZONES above).
  // numberFormat = IETF BCP-47 locale code driving decimal/thousands convention.
  //   en-US → 1,234.56   de-DE → 1.234,56   fr-FR → 1 234,56   en-IN → 1,23,456.78
  "general.locale.language": z.enum([
    "en",
    "ar",
    "de",
    "es",
    "fr",
    "it",
    "ja",
    "ko",
    "nl",
    "pl",
    "pt",
    "ru",
    "tr",
    "zh",
  ]),
  "general.locale.timezone": z.enum(SUPPORTED_TIMEZONES),
  "general.locale.dateFormat": z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
  "general.locale.timeFormat": z.enum(["12h", "24h"]),
  "general.locale.firstDayOfWeek": z.enum(["monday", "sunday"]),
  "general.locale.numberFormat": z.enum(["en-US", "de-DE", "fr-FR", "en-IN"]),

  // ── Financial ────────────────────────────────────────────────────────────────
  // fiscalYearStartMonth    = Default starting month (1–12). Month-based ONLY.
  //                           NOT a full fiscal calendar engine.
  // defaultPaymentTermsDays = Integer days fallback for new transactions.
  //                           NOT a payment terms engine (no Net 30/EOM/2-10).
  // taxInclusive            = Default prices include tax. NOT a tax engine.
  // roundingMode            = Monetary rounding convention.
  "general.financial.fiscalYearStartMonth": z.number().int().min(1).max(12),
  "general.financial.defaultPaymentTermsDays": z.number().int().min(0).max(365),
  "general.financial.taxInclusive": z.boolean(),
  "general.financial.roundingMode": z.enum(["half_up", "half_even"]),

  // ── Company profile metadata ──────────────────────────────────────────────────
  // Optional org profile fields. Empty string is acceptable (no override = empty).
  "general.company.legalName": z.string().max(200),
  "general.company.tradingName": z.string().max(200),
  "general.company.taxId": z.string().max(50),
  "general.company.phone": z.string().max(30),
  "general.company.website": z
    .string()
    .max(200)
    .refine((v) => v === "" || /^https?:\/\/.+/.test(v), {
      message: "Must be a URL starting with http:// or https://, or empty",
    }),
  "general.company.industry": z.enum([
    "technology",
    "finance",
    "healthcare",
    "manufacturing",
    "retail",
    "services",
    "construction",
    "education",
    "nonprofit",
    "other",
  ]),
  "general.company.address.street": z.string().max(200),
  "general.company.address.city": z.string().max(100),
  "general.company.address.state": z.string().max(100),
  "general.company.address.postalCode": z.string().max(20),
  // ISO 3166-1 alpha-2 — curated list of ~60 major business-registration countries.
  "general.company.address.country": z
    .enum([
      "AE",
      "AR",
      "AT",
      "AU",
      "BE",
      "BG",
      "BH",
      "BR",
      "CA",
      "CH",
      "CL",
      "CN",
      "CO",
      "CZ",
      "DE",
      "DK",
      "EG",
      "ES",
      "FI",
      "FR",
      "GB",
      "GH",
      "GR",
      "HK",
      "HR",
      "HU",
      "ID",
      "IE",
      "IL",
      "IN",
      "IT",
      "JP",
      "KE",
      "KR",
      "KW",
      "LU",
      "MX",
      "MY",
      "NG",
      "NL",
      "NO",
      "NZ",
      "OM",
      "PH",
      "PK",
      "PL",
      "PT",
      "QA",
      "RO",
      "RU",
      "SA",
      "SE",
      "SG",
      "SK",
      "TH",
      "TR",
      "TW",
      "TZ",
      "UA",
      "US",
      "VN",
      "ZA",
    ])
    .or(z.literal("")),

  // ── Notifications ─────────────────────────────────────────────────────────────
  // Org-level default email event preferences. NOT a workflow rules engine.
  "general.notifications.emailOnApproval": z.boolean(),
  "general.notifications.emailOnPayment": z.boolean(),
  "general.notifications.emailOnOverdue": z.boolean(),

  // ── Storage ───────────────────────────────────────────────────────────────
  "general.storage.maxUploadBytes": z.number().int().min(1).max(1073741824),
  "general.storage.allowedMimeTypes": MimeTypeAllowListSchema,
  "general.storage.retentionDays": z.number().int().min(1).max(3650),

  // ── Features ─────────────────────────────────────────────────────────────────
  "features.ap.enabled": z.boolean(),
  "features.ar.enabled": z.boolean(),
  "features.purchasing.enabled": z.boolean(),
  "features.gl.enabled": z.boolean(),
  "features.inventory.enabled": z.boolean(),
  "features.hr.enabled": z.boolean(),
  "features.project.enabled": z.boolean(),
  "features.sales.enabled": z.boolean(),
  "features.crm.enabled": z.boolean(),
  "features.budgets.enabled": z.boolean(),
  "features.approvals.enabled": z.boolean(),
  "features.multiCurrency.enabled": z.boolean(),
};

// ── Compile-time coverage assertion ───────────────────────────────────────────
// Fails if a key is in SettingKeyValues but missing from SETTING_VALUE_SCHEMAS.
type _AssertValueSchemaCoverage = {
  [K in SettingKey]: (typeof SETTING_VALUE_SCHEMAS)[K];
};
