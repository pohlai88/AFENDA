/**
 * Relations — erp/supplier
 */
import { relations } from "drizzle-orm";
import { organization, iamPrincipal } from "../../kernel/identity";
import { supplier } from "../../erp/supplier";
import { invoice } from "../../erp/finance/ap";

export const supplierRelations = relations(supplier, ({ one, many }) => ({
  // The buying organisation that owns this supplier record
  organization: one(organization, {
    fields: [supplier.orgId],
    references: [organization.id],
    relationName: "buyerOrg",
  }),
  // The supplier's own organization identity (counterparty)
  supplierOrg: one(organization, {
    fields: [supplier.supplierOrgId],
    references: [organization.id],
    relationName: "supplierOrg",
  }),
  onboardedBy: one(iamPrincipal, {
    fields: [supplier.onboardedByPrincipalId],
    references: [iamPrincipal.id],
  }),
  invoices: many(invoice),
}));
