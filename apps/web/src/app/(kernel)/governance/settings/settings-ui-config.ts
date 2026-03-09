/**
 * UI display config for settings fields.
 *
 * Web-layer only — does NOT duplicate validation logic from SETTING_VALUE_SCHEMAS.
 * Controls label, description, and the form control type rendered in GeneralSettingsClient.
 *
 * Rule: add an entry here whenever a key is added to SettingKeyValues and
 * needs to appear on a settings page.
 */
import type { SettingKey } from "@afenda/contracts";

export type FieldControlType = "select" | "text" | "color" | "toggle" | "textarea";

export type FieldOption = { value: string; label: string };

export type FieldUIConfig = {
  label: string;
  description?: string;
  controlType: FieldControlType;
  options?: FieldOption[];
};

export const SETTINGS_FIELD_UI: Partial<Record<SettingKey, FieldUIConfig>> = {
  // ── Units ──────────────────────────────────────────────────────────────────
  "general.units.weightUnit": {
    label: "Weight Unit",
    description: "Default unit of measure for weight",
    controlType: "select",
    options: [
      { value: "kg", label: "Kilograms (kg)" },
      { value: "lb", label: "Pounds (lb)" },
    ],
  },
  "general.units.volumeUnit": {
    label: "Volume Unit",
    description: "Default unit of measure for volume",
    controlType: "select",
    options: [
      { value: "m3", label: "Cubic Metres (m³)" },
      { value: "ft3", label: "Cubic Feet (ft³)" },
    ],
  },
  "general.units.lengthUnit": {
    label: "Length Unit",
    description: "Default unit of measure for length and distance",
    controlType: "select",
    options: [
      { value: "m",  label: "Metres (m)" },
      { value: "cm", label: "Centimetres (cm)" },
      { value: "mm", label: "Millimetres (mm)" },
      { value: "ft", label: "Feet (ft)" },
      { value: "in", label: "Inches (in)" },
    ],
  },

  // ── Email ──────────────────────────────────────────────────────────────────
  "general.email.buttonText": {
    label: "Email Button Text",
    description: "Label on the call-to-action button in outgoing emails",
    controlType: "text",
  },
  "general.email.buttonColor": {
    label: "Email Button Color",
    description: "Background colour for the email call-to-action button (#rrggbb)",
    controlType: "color",
  },
  "general.email.footerText": {
    label: "Email Footer Text",
    description: "Optional text appended to the footer of all outgoing emails (max 500 characters)",
    controlType: "textarea",
  },

  // ── Locale ─────────────────────────────────────────────────────────────────
  "general.locale.language": {
    label: "UI Language",
    description: "Language used for the application interface (ISO 639-1)",
    controlType: "select",
    options: [
      { value: "en", label: "English" },
      { value: "ar", label: "Arabic (العربية)" },
      { value: "de", label: "German (Deutsch)" },
      { value: "es", label: "Spanish (Español)" },
      { value: "fr", label: "French (Français)" },
      { value: "it", label: "Italian (Italiano)" },
      { value: "ja", label: "Japanese (日本語)" },
      { value: "ko", label: "Korean (한국어)" },
      { value: "nl", label: "Dutch (Nederlands)" },
      { value: "pl", label: "Polish (Polski)" },
      { value: "pt", label: "Portuguese (Português)" },
      { value: "ru", label: "Russian (Русский)" },
      { value: "tr", label: "Turkish (Türkçe)" },
      { value: "zh", label: "Chinese (中文)" },
    ],
  },
  "general.locale.timezone": {
    label: "Timezone",
    description: "Org timezone used for transaction timestamps and due dates (curated IANA zones for major business regions)",
    controlType: "select",
    options: [
      { value: "UTC",                              label: "UTC — Coordinated Universal Time" },
      // North America
      { value: "America/New_York",                 label: "America/New_York — Eastern Time (UTC-5/UTC-4)" },
      { value: "America/Chicago",                  label: "America/Chicago — Central Time (UTC-6/UTC-5)" },
      { value: "America/Denver",                   label: "America/Denver — Mountain Time (UTC-7/UTC-6)" },
      { value: "America/Los_Angeles",              label: "America/Los_Angeles — Pacific Time (UTC-8/UTC-7)" },
      { value: "America/Anchorage",                label: "America/Anchorage — Alaska Time (UTC-9/UTC-8)" },
      { value: "Pacific/Honolulu",                 label: "Pacific/Honolulu — Hawaii Time (UTC-10)" },
      // Canada & Mexico
      { value: "America/Toronto",                  label: "America/Toronto — Eastern Canada (UTC-5/UTC-4)" },
      { value: "America/Vancouver",                label: "America/Vancouver — Pacific Canada (UTC-8/UTC-7)" },
      { value: "America/Mexico_City",              label: "America/Mexico_City — Central Mexico (UTC-6/UTC-5)" },
      // South America
      { value: "America/Sao_Paulo",                label: "America/Sao_Paulo — Brazil (UTC-3)" },
      { value: "America/Argentina/Buenos_Aires",   label: "America/Argentina/Buenos_Aires — Argentina (UTC-3)" },
      { value: "America/Bogota",                   label: "America/Bogota — Colombia (UTC-5)" },
      // Europe
      { value: "Europe/London",                    label: "Europe/London — UK / Ireland (UTC+0/UTC+1)" },
      { value: "Europe/Paris",                     label: "Europe/Paris — France / Belgium (UTC+1/UTC+2)" },
      { value: "Europe/Berlin",                    label: "Europe/Berlin — Germany / Austria (UTC+1/UTC+2)" },
      { value: "Europe/Rome",                      label: "Europe/Rome — Italy (UTC+1/UTC+2)" },
      { value: "Europe/Madrid",                    label: "Europe/Madrid — Spain (UTC+1/UTC+2)" },
      { value: "Europe/Amsterdam",                 label: "Europe/Amsterdam — Netherlands (UTC+1/UTC+2)" },
      { value: "Europe/Stockholm",                 label: "Europe/Stockholm — Sweden (UTC+1/UTC+2)" },
      { value: "Europe/Oslo",                      label: "Europe/Oslo — Norway (UTC+1/UTC+2)" },
      { value: "Europe/Helsinki",                  label: "Europe/Helsinki — Finland (UTC+2/UTC+3)" },
      { value: "Europe/Warsaw",                    label: "Europe/Warsaw — Poland (UTC+1/UTC+2)" },
      { value: "Europe/Prague",                    label: "Europe/Prague — Czech Republic (UTC+1/UTC+2)" },
      { value: "Europe/Bucharest",                 label: "Europe/Bucharest — Romania (UTC+2/UTC+3)" },
      { value: "Europe/Istanbul",                  label: "Europe/Istanbul — Turkey (UTC+3)" },
      { value: "Europe/Moscow",                    label: "Europe/Moscow — Russia (UTC+3)" },
      // Africa & Middle East
      { value: "Africa/Cairo",                     label: "Africa/Cairo — Egypt (UTC+2/UTC+3)" },
      { value: "Africa/Lagos",                     label: "Africa/Lagos — West Africa (UTC+1)" },
      { value: "Africa/Johannesburg",              label: "Africa/Johannesburg — South Africa (UTC+2)" },
      { value: "Asia/Dubai",                       label: "Asia/Dubai — UAE / Gulf (UTC+4)" },
      // Asia
      { value: "Asia/Karachi",                     label: "Asia/Karachi — Pakistan (UTC+5)" },
      { value: "Asia/Kolkata",                     label: "Asia/Kolkata — India (UTC+5:30)" },
      { value: "Asia/Dhaka",                       label: "Asia/Dhaka — Bangladesh (UTC+6)" },
      { value: "Asia/Bangkok",                     label: "Asia/Bangkok — Thailand / SE Asia (UTC+7)" },
      { value: "Asia/Singapore",                   label: "Asia/Singapore — Singapore / Malaysia (UTC+8)" },
      { value: "Asia/Shanghai",                    label: "Asia/Shanghai — China (UTC+8)" },
      { value: "Asia/Tokyo",                       label: "Asia/Tokyo — Japan (UTC+9)" },
      { value: "Asia/Seoul",                       label: "Asia/Seoul — South Korea (UTC+9)" },
      { value: "Asia/Jakarta",                     label: "Asia/Jakarta — Indonesia Western (UTC+7)" },
      // Oceania
      { value: "Australia/Sydney",                 label: "Australia/Sydney — Eastern Australia (UTC+10/UTC+11)" },
      { value: "Australia/Melbourne",              label: "Australia/Melbourne — Victoria (UTC+10/UTC+11)" },
      { value: "Pacific/Auckland",                 label: "Pacific/Auckland — New Zealand (UTC+12/UTC+13)" },
    ],
  },
  "general.locale.dateFormat": {
    label: "Date Format",
    description: "How dates are displayed across the application",
    controlType: "select",
    options: [
      { value: "DD/MM/YYYY", label: "DD/MM/YYYY — e.g. 31/12/2026" },
      { value: "MM/DD/YYYY", label: "MM/DD/YYYY — e.g. 12/31/2026" },
      { value: "YYYY-MM-DD", label: "YYYY-MM-DD — e.g. 2026-12-31 (ISO 8601)" },
    ],
  },
  "general.locale.timeFormat": {
    label: "Time Format",
    description: "12-hour or 24-hour clock display",
    controlType: "select",
    options: [
      { value: "24h", label: "24-hour — e.g. 14:30" },
      { value: "12h", label: "12-hour — e.g. 2:30 PM" },
    ],
  },
  "general.locale.firstDayOfWeek": {
    label: "First Day of Week",
    description: "First day shown in calendar and date pickers",
    controlType: "select",
    options: [
      { value: "monday", label: "Monday" },
      { value: "sunday", label: "Sunday" },
    ],
  },
  "general.locale.numberFormat": {
    label: "Number Format",
    description: "Decimal and thousands separator convention for amounts and quantities",
    controlType: "select",
    options: [
      { value: "en-US", label: "1,234.56 — en-US (English US / UK)" },
      { value: "de-DE", label: "1.234,56 — de-DE (German / Dutch / Spanish EU)" },
      { value: "fr-FR", label: "1 234,56 — fr-FR (French / Russian / Swedish)" },
      { value: "en-IN", label: "1,23,456.78 — en-IN (Indian numbering system)" },
    ],
  },

  // ── Financial ──────────────────────────────────────────────────────────────
  "general.financial.taxInclusive": {
    label: "Tax-Inclusive Pricing",
    description: "Default pricing includes tax. This is a fallback default only — not a tax engine.",
    controlType: "toggle",
  },
  "general.financial.roundingMode": {
    label: "Rounding Mode",
    description: "Monetary rounding convention applied to financial calculations",
    controlType: "select",
    options: [
      { value: "half_up",   label: "Half Up — 2.5 → 3 (common accounting default)" },
      { value: "half_even", label: "Half Even — 2.5 → 2, 3.5 → 4 (banker's rounding)" },
    ],
  },
  "general.financial.fiscalYearStartMonth": {
    label: "Fiscal Year Start Month",
    description: "The month in which the organisation's fiscal year begins (month-based default only)",
    controlType: "select",
    options: [
      { value: "1",  label: "January (Month 1)" },
      { value: "2",  label: "February (Month 2)" },
      { value: "3",  label: "March (Month 3)" },
      { value: "4",  label: "April (Month 4)" },
      { value: "5",  label: "May (Month 5)" },
      { value: "6",  label: "June (Month 6)" },
      { value: "7",  label: "July (Month 7)" },
      { value: "8",  label: "August (Month 8)" },
      { value: "9",  label: "September (Month 9)" },
      { value: "10", label: "October (Month 10)" },
      { value: "11", label: "November (Month 11)" },
      { value: "12", label: "December (Month 12)" },
    ],
  },
  "general.financial.defaultPaymentTermsDays": {
    label: "Default Payment Terms",
    description: "Default number of days before payment is due on new transactions (integer fallback — not a full payment terms engine)",
    controlType: "select",
    options: [
      { value: "0",  label: "Due on Receipt (0 days)" },
      { value: "7",  label: "Net 7 (7 days)" },
      { value: "14", label: "Net 14 (14 days)" },
      { value: "30", label: "Net 30 (30 days)" },
      { value: "45", label: "Net 45 (45 days)" },
      { value: "60", label: "Net 60 (60 days)" },
      { value: "90", label: "Net 90 (90 days)" },
    ],
  },

  // ── Company profile (rendered on /settings/company, not the General page) ──
  "general.company.legalName": {
    label: "Legal Name",
    description: "Registered legal name of the organisation (used on official documents)",
    controlType: "text",
  },
  "general.company.tradingName": {
    label: "Trading Name",
    description: "Name used in day-to-day business if different from legal name",
    controlType: "text",
  },
  "general.company.taxId": {
    label: "Tax ID",
    description: "VAT, GST, EIN, or equivalent tax registration number",
    controlType: "text",
  },
  "general.company.phone": {
    label: "Phone",
    description: "Primary business phone number",
    controlType: "text",
  },
  "general.company.website": {
    label: "Website",
    description: "Company website URL (https://...)",
    controlType: "text",
  },
  "general.company.industry": {
    label: "Industry",
    description: "Primary industry sector",
    controlType: "select",
    options: [
      { value: "technology",    label: "Technology" },
      { value: "finance",       label: "Finance & Banking" },
      { value: "healthcare",    label: "Healthcare" },
      { value: "manufacturing", label: "Manufacturing" },
      { value: "retail",        label: "Retail" },
      { value: "services",      label: "Professional Services" },
      { value: "construction",  label: "Construction" },
      { value: "education",     label: "Education" },
      { value: "nonprofit",     label: "Nonprofit" },
      { value: "other",         label: "Other" },
    ],
  },
  "general.company.address.street": {
    label: "Street Address",
    description: "Street line for the company's registered or primary address",
    controlType: "text",
  },
  "general.company.address.city": {
    label: "City",
    description: "",
    controlType: "text",
  },
  "general.company.address.state": {
    label: "State / Province",
    description: "",
    controlType: "text",
  },
  "general.company.address.postalCode": {
    label: "Postal Code",
    description: "",
    controlType: "text",
  },
  "general.company.address.country": {
    label: "Country",
    description: "ISO 3166-1 alpha-2 country code (curated list of major business-registration countries)",
    controlType: "select",
    options: [
      { value: "AE", label: "UAE" }, { value: "AR", label: "Argentina" },
      { value: "AT", label: "Austria" }, { value: "AU", label: "Australia" },
      { value: "BE", label: "Belgium" }, { value: "BG", label: "Bulgaria" },
      { value: "BH", label: "Bahrain" }, { value: "BR", label: "Brazil" },
      { value: "CA", label: "Canada" }, { value: "CH", label: "Switzerland" },
      { value: "CL", label: "Chile" }, { value: "CN", label: "China" },
      { value: "CO", label: "Colombia" }, { value: "CZ", label: "Czech Republic" },
      { value: "DE", label: "Germany" }, { value: "DK", label: "Denmark" },
      { value: "EG", label: "Egypt" }, { value: "ES", label: "Spain" },
      { value: "FI", label: "Finland" }, { value: "FR", label: "France" },
      { value: "GB", label: "United Kingdom" }, { value: "GH", label: "Ghana" },
      { value: "GR", label: "Greece" }, { value: "HK", label: "Hong Kong" },
      { value: "HR", label: "Croatia" }, { value: "HU", label: "Hungary" },
      { value: "ID", label: "Indonesia" }, { value: "IE", label: "Ireland" },
      { value: "IL", label: "Israel" }, { value: "IN", label: "India" },
      { value: "IT", label: "Italy" }, { value: "JP", label: "Japan" },
      { value: "KE", label: "Kenya" }, { value: "KR", label: "South Korea" },
      { value: "KW", label: "Kuwait" }, { value: "LU", label: "Luxembourg" },
      { value: "MX", label: "Mexico" }, { value: "MY", label: "Malaysia" },
      { value: "NG", label: "Nigeria" }, { value: "NL", label: "Netherlands" },
      { value: "NO", label: "Norway" }, { value: "NZ", label: "New Zealand" },
      { value: "OM", label: "Oman" }, { value: "PH", label: "Philippines" },
      { value: "PK", label: "Pakistan" }, { value: "PL", label: "Poland" },
      { value: "PT", label: "Portugal" }, { value: "QA", label: "Qatar" },
      { value: "RO", label: "Romania" }, { value: "RU", label: "Russia" },
      { value: "SA", label: "Saudi Arabia" }, { value: "SE", label: "Sweden" },
      { value: "SG", label: "Singapore" }, { value: "SK", label: "Slovakia" },
      { value: "TH", label: "Thailand" }, { value: "TR", label: "Turkey" },
      { value: "TW", label: "Taiwan" }, { value: "TZ", label: "Tanzania" },
      { value: "UA", label: "Ukraine" }, { value: "US", label: "United States" },
      { value: "VN", label: "Vietnam" }, { value: "ZA", label: "South Africa" },
    ],
  },

  // ── Notifications (rendered on General page — Notification Preferences section)
  "general.notifications.emailOnApproval": {
    label: "Email on Approval",
    description: "Send an email notification when a document is approved",
    controlType: "toggle",
  },
  "general.notifications.emailOnPayment": {
    label: "Email on Payment",
    description: "Send an email notification when a payment is recorded",
    controlType: "toggle",
  },
  "general.notifications.emailOnOverdue": {
    label: "Email on Overdue",
    description: "Send an email notification when a payment becomes overdue",
    controlType: "toggle",
  },

  // ── Features (rendered on /settings/features, not the General page) ────────
  "features.ap.enabled": {
    label: "Accounts Payable",
    description: "Enable the Accounts Payable module (invoices, bills)",
    controlType: "toggle",
  },
  "features.ar.enabled": {
    label: "Accounts Receivable",
    description: "Enable the Accounts Receivable module",
    controlType: "toggle",
  },
  "features.purchasing.enabled": {
    label: "Purchasing",
    description: "Enable the Purchasing module (purchase orders, vendor management)",
    controlType: "toggle",
  },
  "features.gl.enabled": {
    label: "General Ledger",
    description: "Enable the General Ledger module (journal entries, trial balance)",
    controlType: "toggle",
  },
  "features.inventory.enabled": {
    label: "Inventory",
    description: "Enable the Inventory module (stock tracking, warehouses)",
    controlType: "toggle",
  },
  "features.hr.enabled": {
    label: "HR",
    description: "Enable the Human Resources module (employees, payroll)",
    controlType: "toggle",
  },
  "features.project.enabled": {
    label: "Projects",
    description: "Enable the Project management module",
    controlType: "toggle",
  },
  "features.sales.enabled": {
    label: "Sales",
    description: "Enable the Sales module (quotes, sales orders)",
    controlType: "toggle",
  },
  "features.crm.enabled": {
    label: "CRM",
    description: "Enable the Customer Relationship Management module",
    controlType: "toggle",
  },
  "features.budgets.enabled": {
    label: "Budgets",
    description: "Enable budget tracking and variance reporting",
    controlType: "toggle",
  },
  "features.approvals.enabled": {
    label: "Approvals",
    description: "Enable configurable approval workflows for documents",
    controlType: "toggle",
  },
  "features.multiCurrency.enabled": {
    label: "Multi-Currency",
    description: "Enable transactions and reporting in multiple currencies (entitlement)",
    controlType: "toggle",
  },
};
