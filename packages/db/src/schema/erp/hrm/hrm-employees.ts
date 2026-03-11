import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  index,
  metadataColumns,
  orgColumns,
  workerTypeEnum,
} from "./_shared";

export const hrmPersons = pgTable(
  "hrm_persons",
  {
    ...orgColumns,
    personCode: varchar("person_code", { length: 50 }).notNull(),
    legalName: varchar("legal_name", { length: 255 }).notNull(),
    preferredName: varchar("preferred_name", { length: 255 }),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    middleName: varchar("middle_name", { length: 120 }),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    displayName: varchar("display_name", { length: 255 }),
    birthDate: date("birth_date"),
    genderCode: varchar("gender_code", { length: 50 }),
    maritalStatusCode: varchar("marital_status_code", { length: 50 }),
    nationalityCountryCode: varchar("nationality_country_code", { length: 3 }),
    personalEmail: varchar("personal_email", { length: 320 }),
    mobilePhone: varchar("mobile_phone", { length: 50 }),
    photoFileId: uuid("photo_file_id"),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    personCodeUq: uniqueIndex("hrm_persons_org_person_code_uq").on(t.orgId, t.personCode),
    personalEmailIdx: index("hrm_persons_personal_email_idx").on(t.orgId, t.personalEmail),
  }),
);

export const hrmPersonIdentities = pgTable(
  "hrm_person_identities",
  {
    ...orgColumns,
    personId: uuid("person_id").notNull().references(() => hrmPersons.id),
    identityType: varchar("identity_type", { length: 50 }).notNull(),
    identityNumber: varchar("identity_number", { length: 120 }).notNull(),
    issuingCountryCode: varchar("issuing_country_code", { length: 3 }),
    issuedAt: date("issued_at"),
    expiresAt: date("expires_at"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    verificationStatus: varchar("verification_status", { length: 50 }).default("unverified").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    personIdx: index("hrm_person_identities_person_idx").on(t.orgId, t.personId),
    identityLookupIdx: index("hrm_person_identities_lookup_idx").on(
      t.orgId,
      t.identityType,
      t.identityNumber,
    ),
  }),
);

export const hrmEmployeeProfiles = pgTable(
  "hrm_employee_profiles",
  {
    ...orgColumns,
    personId: uuid("person_id").notNull().references(() => hrmPersons.id),
    employeeCode: varchar("employee_code", { length: 50 }).notNull(),
    workerType: workerTypeEnum("worker_type").notNull(),
    currentStatus: varchar("current_status", { length: 50 }).default("active").notNull(),
    primaryLegalEntityId: uuid("primary_legal_entity_id"),
    primaryEmploymentId: uuid("primary_employment_id"),
    ...metadataColumns,
  },
  (t) => ({
    employeeCodeUq: uniqueIndex("hrm_employee_profiles_org_employee_code_uq").on(t.orgId, t.employeeCode),
    personIdx: index("hrm_employee_profiles_person_idx").on(t.orgId, t.personId),
  }),
);

export const hrmPersonsRelations = relations(hrmPersons, ({ many }) => ({
  identities: many(hrmPersonIdentities),
  employeeProfiles: many(hrmEmployeeProfiles),
}));

export const hrmEmployeeProfilesRelations = relations(hrmEmployeeProfiles, ({ one }) => ({
  person: one(hrmPersons, {
    fields: [hrmEmployeeProfiles.personId],
    references: [hrmPersons.id],
  }),
}));
