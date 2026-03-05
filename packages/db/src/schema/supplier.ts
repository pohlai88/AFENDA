import { pgTable, text, uuid, unique, index, pgEnum } from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "./iam.js";
import { SupplierStatusValues } from "@afenda/contracts";
import { tsz, rlsOrg } from "./_helpers.js";

export const supplierStatusEnum = pgEnum("supplier_status", SupplierStatusValues);

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
