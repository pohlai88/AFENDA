/**
 * Command schemas for SupplierSite entity.
 *
 * RULES:
 *   1. Every command MUST include idempotencyKey.
 *   2. Server-generated fields (id, timestamps, actorPrincipalId) are NOT in commands.
 *   3. Add new error codes to shared/errors.ts.
 *   4. Add new audit actions to kernel/governance/audit/actions.ts.
 *   5. Add to barrel: packages/contracts/src/<domain>/index.ts
 */
import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { SupplierIdSchema } from "../../shared/ids.js";
import { SupplierSiteIdSchema, SupplierSiteTypeValues } from "./supplier-site.entity.js";

// ── Create command ────────────────────────────────────────────────────────────

export const CreateSupplierSiteCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** Parent supplier */
  supplierId: SupplierIdSchema,
  /** Human-readable site name */
  name: z.string().trim().min(1).max(255),
  /** Site type classification */
  siteType: z.enum(SupplierSiteTypeValues),
  /** Whether this is the primary/default site */
  isPrimary: z.boolean().optional().default(false),

  // Address fields
  addressLine1: z.string().trim().min(1).max(255),
  addressLine2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1).max(100),
  stateProvince: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  /** ISO 3166-1 alpha-2 country code */
  countryCode: z.string().length(2).toUpperCase(),

  // Contact information (optional)
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().trim().max(50).optional(),
});

export type CreateSupplierSiteCommand = z.infer<typeof CreateSupplierSiteCommandSchema>;

// ── Update command ────────────────────────────────────────────────────────────

export const UpdateSupplierSiteCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the site to update */
  id: SupplierSiteIdSchema,

  /** Updated site name */
  name: z.string().trim().min(1).max(255).optional(),
  /** Updated site type */
  siteType: z.enum(SupplierSiteTypeValues).optional(),

  // Address fields
  addressLine1: z.string().trim().min(1).max(255).optional(),
  addressLine2: z.string().trim().max(255).nullish(),
  city: z.string().trim().min(1).max(100).optional(),
  stateProvince: z.string().trim().max(100).nullish(),
  postalCode: z.string().trim().max(20).nullish(),
  countryCode: z.string().length(2).toUpperCase().optional(),

  // Contact information
  contactEmail: z.string().email().nullish(),
  contactPhone: z.string().trim().max(50).nullish(),
});

export type UpdateSupplierSiteCommand = z.infer<typeof UpdateSupplierSiteCommandSchema>;

// ── Set Primary command ───────────────────────────────────────────────────────

export const SetPrimarySiteCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the site to make primary */
  id: SupplierSiteIdSchema,
});

export type SetPrimarySiteCommand = z.infer<typeof SetPrimarySiteCommandSchema>;

// ── Deactivate command ────────────────────────────────────────────────────────

export const DeactivateSupplierSiteCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the site to deactivate */
  id: SupplierSiteIdSchema,
  /** Reason for deactivation */
  reason: z.string().trim().min(1).max(500).optional(),
});

export type DeactivateSupplierSiteCommand = z.infer<typeof DeactivateSupplierSiteCommandSchema>;
