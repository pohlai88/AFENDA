/**
 * Setting key vocabulary — pure `as const` array, no Zod.
 *
 * RULES:
 *   1. Safe to import in @afenda/db — no Zod dependency.
 *   2. Matches `PermissionValues` / `AuditActionValues` pattern.
 *   3. Adding a key requires updating all four registry files (see plan §5.3).
 *   4. Platform-scoped keys (developer.*) must NOT appear here.
 *   5. Format: `category.subcategory.fieldName` (all lowercase dot-separated).
 */

export const SettingKeyValues = [
  // General — units of measure
  "general.units.weightUnit",
  "general.units.volumeUnit",
  "general.units.lengthUnit",
  // General — email branding
  "general.email.buttonText",
  "general.email.buttonColor",
  "general.email.footerText",
  // Locale — international standard display preferences.
  // "language"    = UI language code (ISO 639-1). Distinct from numberFormat.
  // "timezone"    = Curated IANA zone (major business regions; not universal).
  // "dateFormat"  = Display-only date rendering. NOT ISO 8601 DB storage.
  // "numberFormat"= Number formatting convention (IETF BCP-47 locale code).
  "general.locale.language",
  "general.locale.timezone",
  "general.locale.dateFormat",
  "general.locale.timeFormat",
  "general.locale.firstDayOfWeek",
  "general.locale.numberFormat",
  // Financial — org-level fiscal and transaction defaults.
  // "fiscalYearStartMonth"    = Default starting month (1–12). Month-based only —
  //                             NOT a full fiscal calendar engine.
  // "defaultPaymentTermsDays" = Integer days fallback for new transactions.
  //                             NOT a payment terms engine (no Net 30/EOM/2-10).
  // "taxInclusive"            = Default prices include tax. NOT a tax engine.
  // "roundingMode"            = Default rounding convention for monetary calcs.
  "general.financial.fiscalYearStartMonth",
  "general.financial.defaultPaymentTermsDays",
  "general.financial.taxInclusive",
  "general.financial.roundingMode",
  // Company — org profile metadata (display/admin, NOT authoritative identity).
  // organization.name, organization.slug, organization.functional_currency remain
  // on the organization table and are managed via PATCH /v1/organization.
  "general.company.legalName",
  "general.company.tradingName",
  "general.company.taxId",
  "general.company.phone",
  "general.company.website",
  "general.company.industry",
  "general.company.address.street",
  "general.company.address.city",
  "general.company.address.state",
  "general.company.address.postalCode",
  "general.company.address.country",
  // Notifications — org-level default email event preferences.
  // NOT a workflow rules engine — simple on/off defaults per event type.
  "general.notifications.emailOnApproval",
  "general.notifications.emailOnPayment",
  "general.notifications.emailOnOverdue",
  // Features — org-admin functional enablement flags (behavior category).
  // NOT engineering rollout flags — those must never enter org_setting.
  "features.ap.enabled",
  "features.ar.enabled",
  "features.purchasing.enabled",
  "features.gl.enabled",
  "features.inventory.enabled",
  "features.hr.enabled",
  "features.project.enabled",
  "features.sales.enabled",
  "features.crm.enabled",
  "features.budgets.enabled",
  "features.approvals.enabled",
  "features.multiCurrency.enabled",
] as const;

export type SettingKey = (typeof SettingKeyValues)[number];
