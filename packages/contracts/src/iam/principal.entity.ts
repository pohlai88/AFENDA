/**
 * Principal entity (ADR-0003).
 *
 * RULES:
 *   1. Principal = authenticated actor (user account or service account).
 *   2. Token.sub is PrincipalId, NOT PersonId.
 *   3. Principal → Person is nullable (service accounts have no person).
 *   4. Person can have multiple principals (merged identities, SSO + password).
 */
import { z } from "zod";
import { PrincipalIdSchema, PersonIdSchema } from "../shared/ids.js";
import { UtcDateTimeSchema } from "../shared/datetime.js";

// ─── Principal Kind (discriminator) ──────────────────────────────────────────

export const PrincipalKindValues = ["user", "service"] as const;
export type PrincipalKind = (typeof PrincipalKindValues)[number];

export const PrincipalKindSchema = z.enum(PrincipalKindValues);

// ─── Principal ───────────────────────────────────────────────────────────────

/**
 * Authenticated actor — user account or service account.
 *
 * - `personId` is nullable: service accounts have no associated person.
 * - `email` is the login email, nullable for service accounts.
 * - `passwordHash` is null for SSO-only users and service accounts.
 */
export const PrincipalSchema = z.object({
  id:        PrincipalIdSchema,
  personId:  PersonIdSchema.nullable(),
  kind:      PrincipalKindSchema,
  email:     z.string().email().nullable(),
  createdAt: UtcDateTimeSchema,
});

export type Principal = z.infer<typeof PrincipalSchema>;

// ─── Principal (create input) ────────────────────────────────────────────────

/**
 * Input for creating a new principal.
 * ID and createdAt are auto-generated.
 */
export const CreatePrincipalSchema = PrincipalSchema.pick({
  personId: true,
  kind: true,
  email: true,
});

export type CreatePrincipal = z.infer<typeof CreatePrincipalSchema>;
