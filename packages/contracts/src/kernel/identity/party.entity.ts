/**
 * Party model entities (ADR-0003).
 *
 * RULES:
 *   1. Party is the universal "legal entity" abstraction — person OR organization.
 *   2. Person and Organization both extend Party via shared PartyId.
 *   3. PartyKind discriminates the subtype at runtime.
 *   4. Never reference TenantId in new code — use OrgId.
 */
import { z } from "zod";
import { PartyIdSchema, PersonIdSchema, OrgIdSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";

// ─── Party Kind (discriminator) ──────────────────────────────────────────────

export const PartyKindValues = ["person", "organization"] as const;
export type PartyKind = (typeof PartyKindValues)[number];

export const PartyKindSchema = z.enum(PartyKindValues);

// ─── Party (base) ────────────────────────────────────────────────────────────

/**
 * Base party — either a person or organization.
 * Used when you need to reference "any legal entity" generically.
 */
export const PartySchema = z.object({
  id: PartyIdSchema,
  kind: PartyKindSchema,
});

export type Party = z.infer<typeof PartySchema>;

// ─── Person ──────────────────────────────────────────────────────────────────

/**
 * Human being — stable identity that survives across logins/merges.
 *
 * Note: email is nullable because imported contacts or ex-employees
 * may not have a known email.
 */
export const PersonSchema = z.object({
  id: PersonIdSchema,
  email: z.string().email().nullable(),
  name: z.string().trim().min(1).nullable(),
  createdAt: UtcDateTimeSchema,
});

export type Person = z.infer<typeof PersonSchema>;

// ─── Organization ────────────────────────────────────────────────────────────

/**
 * Legal entity — company, franchise, counterparty.
 * Replaces the old "tenant" concept with domain language.
 */
export const OrganizationSchema = z.object({
  id: OrgIdSchema,
  slug: z
    .string()
    .trim()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1),
  functionalCurrency: z.string().length(3).toUpperCase().default("USD"),
  createdAt: UtcDateTimeSchema,
});

export type Organization = z.infer<typeof OrganizationSchema>;
