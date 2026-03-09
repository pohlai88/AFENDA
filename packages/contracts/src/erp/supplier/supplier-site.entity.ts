/**
 * SupplierSite entity — physical locations/addresses for a supplier.
 *
 * A supplier can have multiple sites (headquarters, warehouse, billing address, etc.).
 * Each site has its own address and contact information.
 *
 * RULES:
 *   1. Each supplier must have at least one active site before becoming active.
 *   2. Only one site can be marked as primary per supplier.
 *   3. Sites are soft-deactivated, never deleted (audit trail requirement).
 */
import { z } from "zod";
import { OrgIdSchema, SupplierIdSchema, brandedUuid } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";

// ── Branded ID ────────────────────────────────────────────────────────────────

export const SupplierSiteIdSchema = brandedUuid("SupplierSiteId");
export type SupplierSiteId = z.infer<typeof SupplierSiteIdSchema>;

// ── Site Type values ──────────────────────────────────────────────────────────

export const SupplierSiteTypeValues = [
  "HEADQUARTERS",
  "WAREHOUSE",
  "BILLING",
  "SHIPPING",
  "REMIT_TO",
  "OTHER",
] as const;

export type SupplierSiteType = (typeof SupplierSiteTypeValues)[number];

// ── Status values ─────────────────────────────────────────────────────────────

export const SupplierSiteStatusValues = ["active", "inactive"] as const;

export type SupplierSiteStatus = (typeof SupplierSiteStatusValues)[number];

// ── SupplierSite schema ───────────────────────────────────────────────────────

export const SupplierSiteSchema = z.object({
  /** Unique identifier for the site */
  id: SupplierSiteIdSchema,
  /** Organization that owns this supplier relationship */
  orgId: OrgIdSchema,
  /** Parent supplier */
  supplierId: SupplierIdSchema,

  /** Human-readable site name (e.g., "Main Warehouse", "Chicago Office") */
  name: z.string().trim().min(1).max(255),
  /** Site type classification */
  siteType: z.enum(SupplierSiteTypeValues),
  /** Whether this is the primary/default site for the supplier */
  isPrimary: z.boolean(),

  // Address fields
  /** Street address line 1 */
  addressLine1: z.string().trim().min(1).max(255),
  /** Street address line 2 (optional) */
  addressLine2: z.string().trim().max(255).nullish(),
  /** City */
  city: z.string().trim().min(1).max(100),
  /** State/Province/Region */
  stateProvince: z.string().trim().max(100).nullish(),
  /** Postal/ZIP code */
  postalCode: z.string().trim().max(20).nullish(),
  /** ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "MX") */
  countryCode: z.string().length(2).toUpperCase(),

  // Contact information
  /** Site-specific contact email (optional) */
  contactEmail: z.string().email().nullish(),
  /** Site-specific phone number (optional) */
  contactPhone: z.string().trim().max(50).nullish(),

  /** Status: active or inactive */
  status: z.enum(SupplierSiteStatusValues),

  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type SupplierSite = z.infer<typeof SupplierSiteSchema>;
