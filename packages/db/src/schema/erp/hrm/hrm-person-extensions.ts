import { relations } from "drizzle-orm";
import { boolean, date, index, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { metadataColumns, orgColumns } from "./_shared";
import { hrmPersons } from "./hrm-employees";

export const hrmPersonAddresses = pgTable(
  "hrm_person_addresses",
  {
    ...orgColumns,
    personId: uuid("person_id").notNull().references(() => hrmPersons.id),
    addressType: varchar("address_type", { length: 50 }).notNull(),
    line1: varchar("line1", { length: 255 }).notNull(),
    line2: varchar("line2", { length: 255 }),
    city: varchar("city", { length: 120 }),
    stateProvince: varchar("state_province", { length: 120 }),
    postalCode: varchar("postal_code", { length: 20 }),
    countryCode: varchar("country_code", { length: 3 }).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    personIdx: index("hrm_person_addresses_person_idx").on(t.orgId, t.personId),
  }),
);

export const hrmPersonEmergencyContacts = pgTable(
  "hrm_person_emergency_contacts",
  {
    ...orgColumns,
    personId: uuid("person_id").notNull().references(() => hrmPersons.id),
    contactName: varchar("contact_name", { length: 255 }).notNull(),
    relationship: varchar("relationship", { length: 80 }),
    phone: varchar("phone", { length: 50 }).notNull(),
    email: varchar("email", { length: 320 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    personIdx: index("hrm_person_emergency_contacts_person_idx").on(t.orgId, t.personId),
  }),
);

export const hrmPersonDependents = pgTable(
  "hrm_person_dependents",
  {
    ...orgColumns,
    personId: uuid("person_id").notNull().references(() => hrmPersons.id),
    dependentName: varchar("dependent_name", { length: 255 }).notNull(),
    relationship: varchar("relationship", { length: 80 }).notNull(),
    birthDate: date("birth_date"),
    ...metadataColumns,
  },
  (t) => ({
    personIdx: index("hrm_person_dependents_person_idx").on(t.orgId, t.personId),
  }),
);
