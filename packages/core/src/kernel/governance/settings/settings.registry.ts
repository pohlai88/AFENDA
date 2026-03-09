/**
 * Settings registry — per-key metadata.
 *
 * Distinct from value-schemas (validation) and setting-keys (vocabulary).
 * Read at query time for: default merging, secret masking, scope enforcement.
 *
 * Lives in core (not contracts) because:
 *   - JsonValue is only in contracts/execution/outbox
 *   - This drives service-layer logic, not transport contracts
 */
import type { SettingKey } from "@afenda/contracts";
import type { JsonValue } from "@afenda/contracts";

export type SettingCategory =
  | "general"
  | "email"
  | "locale"
  | "financial"
  | "company"
  | "notifications"
  | "discuss"
  | "permissions"
  | "integrations"
  | "features";

/**
 * For feature flag keys only — distinguishes org-admin functional enablement
 * flags from engineering rollout flags (which must NEVER enter org_setting).
 *
 * - `entitlement`: Org has licensed access to a module (controlled by billing).
 * - `behavior`:    Runtime mode switch toggled by org admin.
 *
 * Engineering rollout flags belong to a separate platform-level config surface.
 */
export type FeatureFlagCategory = "entitlement" | "behavior";

export type SettingScope = "org" | "platform";

export type SettingDefinition = {
  key: SettingKey;
  category: SettingCategory;
  scope: SettingScope;
  /** If true: never return raw value in API; return "***" sentinel instead. */
  secret: boolean;
  /** If false: reject writes at runtime. Reserved for future use. */
  mutable: boolean;
  /** Merged in getEffectiveSettings() when no org override exists. */
  defaultValue: JsonValue;
  /**
   * For feature flag keys (category = "features") only.
   * Documents whether this is an entitlement or behavior flag.
   * Engineering rollout flags must never be added to org_setting.
   */
  flagCategory?: FeatureFlagCategory;
};

export const SETTING_REGISTRY: Record<SettingKey, SettingDefinition> = {
  "general.units.weightUnit": {
    key: "general.units.weightUnit",
    category: "general",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "kg",
  },
  "general.units.volumeUnit": {
    key: "general.units.volumeUnit",
    category: "general",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "m3",
  },
  "general.email.buttonText": {
    key: "general.email.buttonText",
    category: "email",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "Contact Us",
  },
  "general.email.buttonColor": {
    key: "general.email.buttonColor",
    category: "email",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "#000000",
  },

  // ── Phase 2 — Units extension ─────────────────────────────────────────────
  "general.units.lengthUnit": {
    key: "general.units.lengthUnit",
    category: "general",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "m",
  },

  // ── Phase 2 — Email extension ──────────────────────────────────────────────
  "general.email.footerText": {
    key: "general.email.footerText",
    category: "email",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "",
  },

  // ── Phase 2 — Locale (international display preferences) ──────────────────
  // language    = UI language code (ISO 639-1). Distinct from numberFormat.
  // timezone    = Curated IANA zone (major business regions; not universal).
  // dateFormat  = Display-only rendering. NOT ISO 8601 DB storage.
  // numberFormat= Number formatting convention (IETF BCP-47 locale code).
  "general.locale.language": {
    key: "general.locale.language",
    category: "locale",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "en",
  },
  "general.locale.timezone": {
    key: "general.locale.timezone",
    category: "locale",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "UTC",
  },
  "general.locale.dateFormat": {
    key: "general.locale.dateFormat",
    category: "locale",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "DD/MM/YYYY",
  },
  "general.locale.timeFormat": {
    key: "general.locale.timeFormat",
    category: "locale",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "24h",
  },
  "general.locale.firstDayOfWeek": {
    key: "general.locale.firstDayOfWeek",
    category: "locale",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "monday",
  },
  "general.locale.numberFormat": {
    key: "general.locale.numberFormat",
    category: "locale",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "en-US",
  },

  // ── Phase 2 — Financial defaults ──────────────────────────────────────────
  // fiscalYearStartMonth    = Default starting month (1–12). Month-based only.
  //                           NOT a full fiscal calendar engine.
  // defaultPaymentTermsDays = Integer days fallback for new transactions.
  //                           NOT a payment terms engine (no Net 30/EOM/2-10).
  "general.financial.fiscalYearStartMonth": {
    key: "general.financial.fiscalYearStartMonth",
    category: "financial",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: 1,
  },
  "general.financial.defaultPaymentTermsDays": {
    key: "general.financial.defaultPaymentTermsDays",
    category: "financial",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: 30,
  },

  // ── Phase 3 — Financial expansion ────────────────────────────────────────
  // taxInclusive  = Default prices include tax. NOT a tax engine.
  // roundingMode  = Monetary rounding convention. "half_up" is the common default.
  "general.financial.taxInclusive": {
    key: "general.financial.taxInclusive",
    category: "financial",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: false,
  },
  "general.financial.roundingMode": {
    key: "general.financial.roundingMode",
    category: "financial",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "half_up",
  },

  // ── Phase 3 — Company profile metadata ───────────────────────────────────
  // These are profile/admin metadata stored in org_setting.
  // organization.name, organization.slug, organization.functional_currency
  // remain on the organization table — NOT duplicated here.
  "general.company.legalName": {
    key: "general.company.legalName",
    category: "company",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "",
  },
  "general.company.tradingName": {
    key: "general.company.tradingName",
    category: "company",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "",
  },
  "general.company.taxId": {
    key: "general.company.taxId",
    category: "company",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "",
  },
  "general.company.phone": {
    key: "general.company.phone",
    category: "company",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "",
  },
  "general.company.website": {
    key: "general.company.website",
    category: "company",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "",
  },
  "general.company.industry": {
    key: "general.company.industry",
    category: "company",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "other",
  },
  "general.company.address.street": {
    key: "general.company.address.street",
    category: "company",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "",
  },
  "general.company.address.city": {
    key: "general.company.address.city",
    category: "company",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "",
  },
  "general.company.address.state": {
    key: "general.company.address.state",
    category: "company",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "",
  },
  "general.company.address.postalCode": {
    key: "general.company.address.postalCode",
    category: "company",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "",
  },
  "general.company.address.country": {
    key: "general.company.address.country",
    category: "company",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "",
  },

  // ── Phase 3 — Notification preferences ───────────────────────────────────
  // Org-level default email event preferences.
  // NOT a workflow rules engine — simple on/off defaults per event type.
  "general.notifications.emailOnApproval": {
    key: "general.notifications.emailOnApproval",
    category: "notifications",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: true,
  },
  "general.notifications.emailOnPayment": {
    key: "general.notifications.emailOnPayment",
    category: "notifications",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: true,
  },
  "general.notifications.emailOnOverdue": {
    key: "general.notifications.emailOnOverdue",
    category: "notifications",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: true,
  },

  // ── Phase 2+3 — Feature flags ─────────────────────────────────────────────
  // Org-admin BEHAVIOR flags (enabled/disabled by org admin).
  // NOT engineering rollout flags — those must never enter org_setting.
  // flagCategory:
  //   "behavior"    = changes runtime org behavior, toggled by org admin
  //   "entitlement" = grants/exposes a capability (billing-controlled)
  "features.ap.enabled": {
    key: "features.ap.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: true,
    flagCategory: "behavior",
  },
  "features.ar.enabled": {
    key: "features.ar.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: true,
    flagCategory: "behavior",
  },
  "features.purchasing.enabled": {
    key: "features.purchasing.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: false,
    flagCategory: "behavior",
  },
  "features.gl.enabled": {
    key: "features.gl.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: true,
    flagCategory: "behavior",
  },
  "features.inventory.enabled": {
    key: "features.inventory.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: false,
    flagCategory: "behavior",
  },
  "features.hr.enabled": {
    key: "features.hr.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: false,
    flagCategory: "behavior",
  },
  "features.project.enabled": {
    key: "features.project.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: false,
    flagCategory: "behavior",
  },
  "features.sales.enabled": {
    key: "features.sales.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: false,
    flagCategory: "behavior",
  },
  "features.crm.enabled": {
    key: "features.crm.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: false,
    flagCategory: "behavior",
  },
  "features.budgets.enabled": {
    key: "features.budgets.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: false,
    flagCategory: "behavior",
  },
  "features.approvals.enabled": {
    key: "features.approvals.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: false,
    flagCategory: "behavior",
  },
  "features.multiCurrency.enabled": {
    key: "features.multiCurrency.enabled",
    category: "features",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: false,
    flagCategory: "entitlement",
  },
};

// ── Compile-time coverage assertion ───────────────────────────────────────────
// Fails if a key is in SettingKeyValues but missing from SETTING_REGISTRY.
// Zero runtime cost — erased after TypeScript compilation.
type _AssertRegistryCoverage = {
  [K in SettingKey]: (typeof SETTING_REGISTRY)[K];
};
