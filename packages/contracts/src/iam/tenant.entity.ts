/**
 * @deprecated This file is deprecated. Use Organization from party.entity.ts.
 *
 * Tenant aliases for backward compatibility during ADR-0003 migration.
 * All new code should use Organization from party.entity.ts.
 *
 * MIGRATION:
 *   - TenantSchema → OrganizationSchema
 *   - TenantTypeValues → PartyKindValues (person | organization)
 *   - TenantSlugSchema → use OrganizationSchema.shape.slug
 */
import { z } from "zod";
import { OrgIdSchema } from "../shared/ids.js";
import { CurrencyCodeSchema } from "../shared/money.js";
import { UtcDateTimeSchema } from "../shared/datetime.js";

// Re-export OrganizationSchema as the primary schema now
export { OrganizationSchema, type Organization } from "./party.entity.js";

// ─── Deprecated tenant type ───────────────────────────────────────────────────

/**
 * @deprecated Use PartyKindValues from party.entity.ts instead.
 * Tenant type values kept for backward compatibility.
 */
export const TenantTypeValues = ["organization", "personal", "external"] as const;

/** @deprecated Use PartyKindSchema from party.entity.ts */
export const TenantTypeSchema = z.enum(TenantTypeValues);
/** @deprecated */
export type TenantType = z.infer<typeof TenantTypeSchema>;

// ─── Deprecated slug primitive ────────────────────────────────────────────────

/**
 * @deprecated Use OrganizationSchema.shape.slug instead.
 */
export const TenantSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens");

/** @deprecated */
export type TenantSlug = z.infer<typeof TenantSlugSchema>;

// ─── Deprecated entity schema (alias for Organization) ────────────────────────

/**
 * @deprecated Use OrganizationSchema from party.entity.ts instead.
 * Kept for backward compatibility during ADR-0003 migration.
 */
export const TenantSchema = z.object({
  id: OrgIdSchema,
  slug: TenantSlugSchema,
  name: z.string().trim().min(1).max(255),
  type: TenantTypeSchema,
  functionalCurrencyCode: CurrencyCodeSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema.optional(), // Now optional since Organization doesn't have updatedAt
});

/** @deprecated Use Organization from party.entity.ts */
export type Tenant = z.infer<typeof TenantSchema>;

// ─── Deprecated create command ────────────────────────────────────────────────

/**
 * @deprecated Use Organization creation through the new party model.
 */
export const CreateTenantSchema = z.object({
  slug: TenantSlugSchema,
  name: z.string().trim().min(1).max(255),
  type: TenantTypeSchema,
  functionalCurrencyCode: CurrencyCodeSchema,
});

/** @deprecated */
export type CreateTenant = z.infer<typeof CreateTenantSchema>;
