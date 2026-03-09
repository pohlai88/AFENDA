import { pgTable, text, uuid, jsonb, boolean, integer, unique, index } from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "../identity.js";
import { tsz, rlsOrg } from "../../_helpers.js";

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM FIELD DEF — admin-managed field definitions (governance metadata)
//
// Design notes:
//   - api_key is immutable after creation (schema identifier, like a column name).
//   - entity_type uses a controlled vocabulary from CustomFieldEntityTypeValues in
//     contracts; stored as text (no PG enum) to allow growth without migrations.
//   - options_json stores CustomFieldOption[] (typed at app layer, not DB layer).
//   - show_in_pdf is a metadata flag for future PDF template integration.
//   - No created_at/updated_at distinction; this is admin metadata, not a business
//     entity. Only created_at is tracked; changes are in the audit log.
// ─────────────────────────────────────────────────────────────────────────────
export const customFieldDef = pgTable(
  "custom_field_def",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    label: text("label").notNull(),
    /** Immutable after creation — treated as a schema identifier (lowercase slug). */
    apiKey: text("api_key").notNull(),
    dataType: text("data_type").notNull(),
    /** Typed as CustomFieldOption[] at application layer; null for non-dropdown types. */
    optionsJson: jsonb("options_json"),
    required: boolean("required").notNull().default(false),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    helpText: text("help_text"),
    defaultValueJson: jsonb("default_value_json"),
    showInPdf: boolean("show_in_pdf").notNull().default(false),
    createdAt: tsz("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    unique("custom_field_def_org_type_key_uidx").on(t.orgId, t.entityType, t.apiKey),
    index("custom_field_def_org_type_idx").on(t.orgId, t.entityType),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM FIELD VALUE — per-entity-instance values (domain business data)
//
// Design notes:
//   - entity_id is a polymorphic FK enforced at application layer, not DB layer.
//     Adding a DB FK here would require per-entity-type constraint and complicates
//     migrations. Application layer validates entity_id exists before upserting.
//   - INDEX (org_id, entity_type, entity_id) is the primary query index.
//     The common read is "fetch all custom field values for this entity" — entity-
//     centric. Without this index, loading values for a list view requires sequential
//     scan keyed by field_def_id, which is the wrong shape.
//   - value_json = null means "no value stored; definition defaultValueJson applies in UI".
// ─────────────────────────────────────────────────────────────────────────────
export const customFieldValue = pgTable(
  "custom_field_value",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    fieldDefId: uuid("field_def_id")
      .notNull()
      .references(() => customFieldDef.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    /** Polymorphic — FK enforced at application layer. */
    entityId: uuid("entity_id").notNull(),
    valueJson: jsonb("value_json"),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
    updatedBy: uuid("updated_by").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    unique("custom_field_value_def_entity_uidx").on(t.orgId, t.fieldDefId, t.entityId),
    index("custom_field_value_entity_idx").on(t.orgId, t.entityType, t.entityId),
    rlsOrg,
  ],
);
