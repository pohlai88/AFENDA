import { pgTable, text, uuid, unique, index, pgEnum, boolean } from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "../kernel/identity";
import {
  SupplierStatusValues,
  SupplierSiteTypeValues,
  SupplierSiteStatusValues,
  BankAccountTypeValues,
  BankAccountVerificationStatusValues,
  SupplierBankAccountStatusValues,
} from "@afenda/contracts";
import { tsz, rlsOrg } from "../_helpers";

export const supplierStatusEnum = pgEnum("supplier_status", SupplierStatusValues);
export const supplierSiteTypeEnum = pgEnum("supplier_site_type", SupplierSiteTypeValues);
export const supplierSiteStatusEnum = pgEnum("supplier_site_status", SupplierSiteStatusValues);
export const bankAccountTypeEnum = pgEnum("bank_account_type", BankAccountTypeValues);
export const bankAccountVerificationStatusEnum = pgEnum(
  "bank_account_verification_status",
  BankAccountVerificationStatusValues,
);
export const supplierBankAccountStatusEnum = pgEnum(
  "supplier_bank_account_status",
  SupplierBankAccountStatusValues,
);

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER — position table (Party Model).
//
// A supplier is a *relationship*: "Org A considers Org B as their supplier."
// `org_id`          = the buyer org (who owns this supplier relationship)
// `supplier_org_id` = the supplier entity's own identity (IS an organization).
//                     Created on onboarding if the supplier hasn't registered yet.
//                     Links to their portal once they have. This is the canonical
//                     IAM position pattern — identity is separate from auth/access.
// ─────────────────────────────────────────────────────────────────────────────
export const supplier = pgTable(
  "supplier",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** The supplier's own organization identity (counterparty). */
    supplierOrgId: uuid("supplier_org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    taxId: text("tax_id"),
    contactEmail: text("contact_email"),
    status: supplierStatusEnum("status").notNull().default("draft"),
    onboardedByPrincipalId: uuid("onboarded_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    onboardedAt: tsz("onboarded_at"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("supplier_org_counterparty_uidx").on(t.orgId, t.supplierOrgId),
    index("supplier_org_idx").on(t.orgId),
    index("supplier_counterparty_idx").on(t.supplierOrgId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER SITE — physical locations/addresses for a supplier.
// A supplier can have multiple sites (headquarters, warehouse, billing, etc.).
// ─────────────────────────────────────────────────────────────────────────────
export const supplierSite = pgTable(
  "supplier_site",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id, { onDelete: "cascade" }),
    /** Human-readable site name */
    name: text("name").notNull(),
    /** Site type classification */
    siteType: supplierSiteTypeEnum("site_type").notNull(),
    /** Whether this is the primary/default site for the supplier */
    isPrimary: boolean("is_primary").notNull().default(false),

    // Address fields
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    city: text("city").notNull(),
    stateProvince: text("state_province"),
    postalCode: text("postal_code"),
    /** ISO 3166-1 alpha-2 country code */
    countryCode: text("country_code").notNull(),

    // Contact information
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),

    status: supplierSiteStatusEnum("status").notNull().default("active"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("supplier_site_supplier_idx").on(t.supplierId),
    index("supplier_site_org_idx").on(t.orgId),
    index("supplier_site_org_supplier_primary_idx").on(t.orgId, t.supplierId, t.isPrimary),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER BANK ACCOUNT — payment destinations for a supplier.
// Supports both domestic (ABA/account number) and international (IBAN/BIC).
// ─────────────────────────────────────────────────────────────────────────────
export const supplierBankAccount = pgTable(
  "supplier_bank_account",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id, { onDelete: "cascade" }),

    /** Human-readable account nickname */
    nickname: text("nickname").notNull(),
    /** Bank name */
    bankName: text("bank_name").notNull(),
    /** Bank branch name/location (optional) */
    branchName: text("branch_name"),

    // Domestic (US) bank details
    /** ABA routing number */
    routingNumber: text("routing_number"),
    /** Bank account number */
    accountNumber: text("account_number").notNull(),
    /** Account type */
    accountType: bankAccountTypeEnum("account_type").notNull(),

    // International bank details
    /** IBAN (International Bank Account Number) */
    iban: text("iban"),
    /** BIC/SWIFT code */
    bicSwift: text("bic_swift"),

    /** ISO 4217 currency code */
    currencyCode: text("currency_code").notNull(),
    /** ISO 3166-1 alpha-2 country code for the bank */
    bankCountryCode: text("bank_country_code").notNull(),

    /** Whether this is the primary/default account for payments */
    isPrimary: boolean("is_primary").notNull().default(false),

    /** Verification status for fraud prevention */
    verificationStatus: bankAccountVerificationStatusEnum("verification_status")
      .notNull()
      .default("UNVERIFIED"),
    /** When the account was verified */
    verifiedAt: tsz("verified_at"),
    /** Principal who verified the account */
    verifiedByPrincipalId: uuid("verified_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),

    status: supplierBankAccountStatusEnum("status").notNull().default("active"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("supplier_bank_account_supplier_idx").on(t.supplierId),
    index("supplier_bank_account_org_idx").on(t.orgId),
    index("supplier_bank_account_org_supplier_primary_idx").on(t.orgId, t.supplierId, t.isPrimary),
    index("supplier_bank_account_verified_by_principal_id_idx").on(t.verifiedByPrincipalId),
    rlsOrg,
  ],
);
