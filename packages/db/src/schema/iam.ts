import {
  pgTable, text, uuid, primaryKey, unique, uniqueIndex, index, check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tsz, rlsOrg, rlsPrincipal } from "./_helpers.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ADR-0003: PARTY MODEL — identity tables (Phase 4 complete)
// Old tenant/iam_user/iam_membership tables have been dropped.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PARTY — universal "legal entity" abstraction.
 * Base table for both person and organization (shared primary key pattern).
 */
export const party = pgTable(
  "party",
  {
    id:          uuid("id").defaultRandom().primaryKey(),
    kind:        text("kind").notNull(), // 'person' | 'organization'
    externalKey: text("external_key"),   // deterministic seed anchor (e.g. "org:demo")
    updatedAt:   tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    check("party_kind_check", sql`${t.kind} IN ('person','organization')`),
    uniqueIndex("party_external_key_uidx").on(t.externalKey).where(sql`external_key IS NOT NULL`),
    index("party_kind_idx").on(t.kind),
  ],
);

/**
 * PERSON — human being (may or may not have a login).
 * Shares primary key with party (1:1 relationship).
 */
export const person = pgTable(
  "person",
  {
    id:        uuid("id").primaryKey().references(() => party.id, { onDelete: "cascade" }),
    email:     text("email"),  // nullable: imported contacts may lack email
    name:      text("name"),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    // Partial unique — only enforced when email is present
    uniqueIndex("person_email_uidx").on(t.email).where(sql`email IS NOT NULL`),
  ],
);

/**
 * ORGANIZATION — company, franchise, counterparty.
 * Shares primary key with party (1:1 relationship).
 * Replaces 'tenant' concept with domain language.
 */
export const organization = pgTable("organization", {
  id:                 uuid("id").primaryKey().references(() => party.id, { onDelete: "cascade" }),
  slug:               text("slug").notNull().unique(),
  name:               text("name").notNull(),
  functionalCurrency: text("functional_currency").notNull().default("USD"),
  createdAt:          tsz("created_at").defaultNow().notNull(),
});

/**
 * IAM_PRINCIPAL — authenticated actor (user account or service account).
 * Token.sub is principal_id. Replaces iam_user conceptually.
 */
export const iamPrincipal = pgTable(
  "iam_principal",
  {
    id:           uuid("id").defaultRandom().primaryKey(),
    personId:     uuid("person_id").references(() => person.id, { onDelete: "set null" }), // NULL for service accounts
    kind:         text("kind").notNull(), // 'user' | 'service'
    email:        text("email").unique(), // login email (nullable for service)
    passwordHash: text("password_hash"),  // NULL = SSO-only or service account
    createdAt:    tsz("created_at").defaultNow().notNull(),
    updatedAt:    tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    check("iam_principal_kind_check", sql`${t.kind} IN ('user','service')`),
    index("principal_person_idx").on(t.personId),
    index("principal_kind_idx").on(t.kind),
  ],
);

/**
 * PARTY_ROLE — "party X plays role Y in org Z" — the HAT.
 * Single FK target for membership (full referential integrity).
 */
export const partyRole = pgTable(
  "party_role",
  {
    id:        uuid("id").defaultRandom().primaryKey(),
    orgId:     uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    partyId:   uuid("party_id").notNull().references(() => party.id, { onDelete: "cascade" }),
    roleType:  text("role_type").notNull(), // employee | supplier | customer | shareholder | ...
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("party_role_org_party_type_uidx").on(t.orgId, t.partyId, t.roleType),
    index("party_role_lookup_idx").on(t.orgId, t.roleType, t.partyId),
    index("party_role_party_idx").on(t.partyId),
    rlsOrg,
  ],
);

/**
 * MEMBERSHIP — links principal → party_role.
 * Single FK, full referential integrity. No polymorphic FKs.
 */
export const membership = pgTable(
  "membership",
  {
    id:          uuid("id").defaultRandom().primaryKey(),
    principalId: uuid("principal_id").notNull().references(() => iamPrincipal.id, { onDelete: "cascade" }),
    partyRoleId: uuid("party_role_id").notNull().references(() => partyRole.id, { onDelete: "cascade" }),
    createdAt:   tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("membership_principal_party_role_uidx").on(t.principalId, t.partyRoleId),
    index("membership_principal_idx").on(t.principalId),
    index("membership_party_role_idx").on(t.partyRoleId),
    rlsPrincipal,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// RBAC — roles and permissions (updated for ADR-0003)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IAM_ROLE — named role within an organization (e.g., admin, approver).
 */
export const iamRole = pgTable(
  "iam_role",
  {
    id:        uuid("id").defaultRandom().primaryKey(),
    orgId:     uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    key:       text("key").notNull(), // e.g. "admin" | "approver" | "operator"
    name:      text("name").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("iam_role_org_key_uidx").on(t.orgId, t.key),
    rlsOrg,
  ],
);

/**
 * IAM_PERMISSION — global permission keys (not org-scoped).
 */
export const iamPermission = pgTable("iam_permission", {
  id:        uuid("id").defaultRandom().primaryKey(),
  key:       text("key").notNull().unique(), // e.g. "ap.invoice.submit"
  createdAt: tsz("created_at").defaultNow().notNull(),
});

/**
 * IAM_ROLE_PERMISSION — links roles to permissions.
 */
export const iamRolePermission = pgTable(
  "iam_role_permission",
  {
    roleId:       uuid("role_id").notNull().references(() => iamRole.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id").notNull().references(() => iamPermission.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })]
);

/**
 * IAM_PRINCIPAL_ROLE — links principals to roles within an org.
 * Renamed from iam_user_role in Phase 4.
 */
export const iamPrincipalRole = pgTable(
  "iam_principal_role",
  {
    orgId:       uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id").notNull().references(() => iamPrincipal.id, { onDelete: "cascade" }),
    roleId:      uuid("role_id").notNull().references(() => iamRole.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.principalId, t.roleId] }), rlsOrg],
);
