import { pgTable, text, uuid, jsonb, unique, index } from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "../identity.js";
import { tsz, rlsOrg } from "../../_helpers.js";

// ─────────────────────────────────────────────────────────────────────────────
// ORG SETTING — org-scoped key/value configuration store
//
// Design notes:
//   - value_json is intentionally polymorphic (one column, all value types).
//     Type safety is enforced at service boundary by SETTING_VALUE_SCHEMAS.
//   - No created_at / created_by. The audit_log is the history trail.
//   - updated_at is mutable; this is config, not an append-only truth table.
//   - Platform-scoped settings (developer.*) must NOT use this table.
// ─────────────────────────────────────────────────────────────────────────────
export const orgSetting = pgTable(
  "org_setting",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueJson: jsonb("value_json").notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
    updatedBy: uuid("updated_by").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    unique("org_setting_org_key_uidx").on(t.orgId, t.key),
    index("org_setting_org_idx").on(t.orgId),
    rlsOrg,
  ],
);
