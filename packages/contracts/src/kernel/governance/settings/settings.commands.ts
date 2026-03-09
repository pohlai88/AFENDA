/**
 * Settings write command — update one or more org settings atomically.
 *
 * RULES:
 *   1. `idempotencyKey` in body matches existing command pattern.
 *   2. The entire `updates` array is all-or-nothing (single DB transaction).
 *   3. `value: null` means "clear org override, fall back to system default".
 *   4. Omitted keys are unchanged.
 *   5. `SettingUpdate` discriminated union enforces key/value type safety at
 *      compile time. Add a new variant for every new key added to SettingKeyValues.
 */
import { z } from "zod";
import { IdempotencyKeySchema } from "../../execution/idempotency/request-key.js";
import { SettingKeyValues } from "./setting-keys.js";
import { JsonValueSchema } from "../../execution/outbox/envelope.js";

export const UpdateSettingsCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  updates: z
    .array(
      z.object({
        key: z.enum(SettingKeyValues),
        value: JsonValueSchema.nullable(),
      }),
    )
    .min(1)
    .max(50),
});

export type UpdateSettingsCommand = z.infer<typeof UpdateSettingsCommandSchema>;

/**
 * Typed discriminated union — prevents mismatched key/value pairs at compile time.
 * Maintain alongside SettingKeyValues: one variant per key.
 */
export type SettingUpdate =
  // Units
  | { key: "general.units.weightUnit"; value: "kg" | "lb" | null }
  | { key: "general.units.volumeUnit"; value: "m3" | "ft3" | null }
  | { key: "general.units.lengthUnit"; value: "m" | "ft" | "in" | "cm" | "mm" | null }
  // Email
  | { key: "general.email.buttonText"; value: string | null }
  | { key: "general.email.buttonColor"; value: string | null }
  | { key: "general.email.footerText"; value: string | null }
  // Locale (display preferences — see setting-keys.ts for semantics)
  | { key: "general.locale.language"; value: "en" | "ar" | "de" | "es" | "fr" | "it" | "ja" | "ko" | "nl" | "pl" | "pt" | "ru" | "tr" | "zh" | null }
  | { key: "general.locale.timezone"; value: string | null }
  | { key: "general.locale.dateFormat"; value: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | null }
  | { key: "general.locale.timeFormat"; value: "12h" | "24h" | null }
  | { key: "general.locale.firstDayOfWeek"; value: "monday" | "sunday" | null }
  | { key: "general.locale.numberFormat"; value: "en-US" | "de-DE" | "fr-FR" | "en-IN" | null }
  // Financial (see setting-keys.ts for scope notes)
  | { key: "general.financial.fiscalYearStartMonth"; value: number | null }
  | { key: "general.financial.defaultPaymentTermsDays"; value: number | null }
  | { key: "general.financial.taxInclusive"; value: boolean | null }
  | { key: "general.financial.roundingMode"; value: "half_up" | "half_even" | null }
  // Company profile metadata (see setting-keys.ts for scope notes)
  | { key: "general.company.legalName"; value: string | null }
  | { key: "general.company.tradingName"; value: string | null }
  | { key: "general.company.taxId"; value: string | null }
  | { key: "general.company.phone"; value: string | null }
  | { key: "general.company.website"; value: string | null }
  | { key: "general.company.industry"; value: "technology" | "finance" | "healthcare" | "manufacturing" | "retail" | "services" | "construction" | "education" | "nonprofit" | "other" | null }
  | { key: "general.company.address.street"; value: string | null }
  | { key: "general.company.address.city"; value: string | null }
  | { key: "general.company.address.state"; value: string | null }
  | { key: "general.company.address.postalCode"; value: string | null }
  | { key: "general.company.address.country"; value: string | null }
  // Notifications (see setting-keys.ts for scope notes)
  | { key: "general.notifications.emailOnApproval"; value: boolean | null }
  | { key: "general.notifications.emailOnPayment"; value: boolean | null }
  | { key: "general.notifications.emailOnOverdue"; value: boolean | null }
  // Features
  | { key: "features.ap.enabled"; value: boolean | null }
  | { key: "features.ar.enabled"; value: boolean | null }
  | { key: "features.purchasing.enabled"; value: boolean | null }
  | { key: "features.gl.enabled"; value: boolean | null }
  | { key: "features.inventory.enabled"; value: boolean | null }
  | { key: "features.hr.enabled"; value: boolean | null }
  | { key: "features.project.enabled"; value: boolean | null }
  | { key: "features.sales.enabled"; value: boolean | null }
  | { key: "features.crm.enabled"; value: boolean | null }
  | { key: "features.budgets.enabled"; value: boolean | null }
  | { key: "features.approvals.enabled"; value: boolean | null }
  | { key: "features.multiCurrency.enabled"; value: boolean | null };
