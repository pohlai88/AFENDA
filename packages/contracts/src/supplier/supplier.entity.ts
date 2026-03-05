/**
 * Supplier entity — a buyer-side relationship/position record (party-lite).
 *
 * RULES:
 *   1. `SupplierStatusValues` is `as const` — import it in `@afenda/db` for the
 *      Postgres enum; never duplicate the list.
 *   2. `orgId` = buyer org that owns this relationship; `supplierOrgId` =
 *      the supplier entity's canonical identity. Never confuse the two.
 *   3. AP invoices must reference `id` (SupplierId), NOT `supplierOrgId`, so
 *      the buyer's relationship controls suspension, terms, and status.
 *   4. `taxId` format validation belongs in `@afenda/core` — jurisdictions differ.
 *   5. Mutation commands (onboard, suspend, reactivate) live in `supplier.commands.ts`.
 */
import { z } from "zod";
import {
  SupplierIdSchema,
  OrgIdSchema,
} from "../shared/ids.js";
import { UtcDateTimeSchema } from "../shared/datetime.js";

/**
 * Status values as a const tuple — import in @afenda/db:
 * pgEnum('supplier_status', SupplierStatusValues)
 */
export const SupplierStatusValues = [
  "draft",
  "active",
  "suspended",
] as const;

export const SupplierStatusSchema = z.enum(SupplierStatusValues);

export type SupplierStatus = z.infer<typeof SupplierStatusSchema>;

/**
 * Supplier is a *relationship/position* record (party-lite).
 *
 * `orgId`         = buyer org that owns this supplier relationship
 * `supplierOrgId` = supplier entity's canonical identity (an organization row)
 *
 * AP invoices must reference `id` (SupplierId), NOT `supplierOrgId`,
 * so that the buyer's relationship controls status, suspension, and terms.
 */
export const SupplierSchema = z.object({
  id:            SupplierIdSchema,

  orgId:         OrgIdSchema,
  supplierOrgId: OrgIdSchema,

  name:         z.string().trim().min(1).max(255),

  // Tax IDs vary widely by jurisdiction; format validation belongs in core.
  taxId:        z.string().trim().min(1).max(64).nullable(),

  // Optional: draft suppliers may be created before contact info is known.
  contactEmail: z.string().email().nullable(),

  status:    SupplierStatusSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type Supplier = z.infer<typeof SupplierSchema>;

/**
 * Create payload.
 *
 * `supplierOrgId` is optional here: if omitted, core is responsible for
 * creating an organization record before persisting the relationship.
 * When the caller already has the party identity (e.g. from onboarding),
 * passing it avoids that extra round-trip.
 *
 * For the full onboarding flow (contactEmail required, docs attached) add
 * `OnboardSupplierCommandSchema` in `supplier.commands.ts`.
 */
export const CreateSupplierSchema = z.object({
  supplierOrgId: OrgIdSchema.optional(),
  name:          z.string().trim().min(1).max(255),
  taxId:         z.string().trim().min(1).max(64).nullable().optional(),
  contactEmail:  z.string().email().nullable().optional(),
});

export type CreateSupplier = z.infer<typeof CreateSupplierSchema>;
