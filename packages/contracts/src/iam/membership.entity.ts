/**
 * PartyRole + Membership entities (ADR-0003).
 *
 * RULES:
 *   1. PartyRole = "party X plays role Y in org Z" — the HAT.
 *   2. Membership links principal → party_role (single FK, full integrity).
 *   3. No polymorphic FKs — party_role_id is a real foreign key.
 *   4. Multiple principals can share the same party_role (e.g., supplier contacts).
 */
import { z } from "zod";
import {
  PartyRoleIdSchema,
  OrgIdSchema,
  PartyIdSchema,
  PrincipalIdSchema,
} from "../shared/ids.js";
import { UtcDateTimeSchema } from "../shared/datetime.js";
import { RoleTypeValues, type RoleType } from "./role-type.js";

// ─── PartyRole ───────────────────────────────────────────────────────────────

/**
 * "Party X plays role Y in org Z" — the hat.
 *
 * Example: Acme Corp (party) is a "supplier" (roleType) in BuyerInc (org).
 */
export const PartyRoleSchema = z.object({
  id:       PartyRoleIdSchema,
  orgId:    OrgIdSchema,
  partyId:  PartyIdSchema,
  roleType: z.enum(RoleTypeValues),
});

export type PartyRole = z.infer<typeof PartyRoleSchema>;

// ─── Membership ──────────────────────────────────────────────────────────────

/**
 * Links a principal (authenticated actor) to a party_role (hat).
 *
 * This is the single source of truth for "who can act as what":
 *   - Alice (principal) is a member of Acme Corp's supplier role in BuyerInc
 *   - Bob (principal) is also a member of the same party_role
 *   - Both can log in and act as "Acme Corp supplier"
 *
 * No polymorphic FKs — party_role_id is a real foreign key with full integrity.
 */
export const MembershipSchema = z.object({
  id:          z.string().uuid().brand<"MembershipId">(),
  principalId: PrincipalIdSchema,
  partyRoleId: PartyRoleIdSchema,
  createdAt:   UtcDateTimeSchema,
});

export type Membership = z.infer<typeof MembershipSchema>;
export type MembershipId = Membership["id"];

// ─── ActiveContext (for JWT / request) ───────────────────────────────────────

/**
 * The currently selected "hat" in a request.
 * Stored in JWT and used by middleware to SET LOCAL app.* GUCs.
 */
export const ActiveContextSchema = z.object({
  partyRoleId: PartyRoleIdSchema,
  orgId:       OrgIdSchema,
  roleType:    z.enum(RoleTypeValues).optional(),
});

export type ActiveContext = z.infer<typeof ActiveContextSchema>;

// ─── Context list response (for /me/contexts endpoint) ───────────────────────

/**
 * Single context item in the /me/contexts response.
 * Used by UI for context switching dropdown.
 */
export const ContextItemSchema = z.object({
  partyRoleId: PartyRoleIdSchema,
  orgId:       OrgIdSchema,
  orgName:     z.string(),
  roleType:    z.enum(RoleTypeValues),
  partyName:   z.string(),
});

export type ContextItem = z.infer<typeof ContextItemSchema>;
