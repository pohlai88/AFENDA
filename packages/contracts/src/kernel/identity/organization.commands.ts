/**
 * Organization write commands — update display name and base currency.
 *
 * RULES:
 *   1. These fields live on the `organization` table, not in `org_setting`.
 *      organization.slug is immutable after creation and is NOT here.
 *   2. `idempotencyKey` follows the standard command pattern.
 *   3. At least one field must be present (validated at route layer).
 */
import { z } from "zod";
import { IdempotencyKeySchema } from "../execution/idempotency/request-key.js";

export const UpdateOrganizationCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** Display name for the organization. Source of truth: organization.name. */
  name: z.string().trim().min(1).max(200).optional(),
  /** ISO 4217 alpha-3 currency code (uppercase). Source of truth: organization.functional_currency. */
  functionalCurrency: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
});

export type UpdateOrganizationCommand = z.infer<typeof UpdateOrganizationCommandSchema>;

export const OrgProfileResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  functionalCurrency: z.string(),
  createdAt: z.string().datetime(),
});

export type OrgProfileResponse = z.infer<typeof OrgProfileResponseSchema>;

export const OrgMemberSchema = z.object({
  principalId: z.string().uuid(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  role: z.string(),
  joinedAt: z.string().datetime(),
});

export type OrgMember = z.infer<typeof OrgMemberSchema>;

export const OrgMembersResponseSchema = z.object({
  members: z.array(OrgMemberSchema),
});

export type OrgMembersResponse = z.infer<typeof OrgMembersResponseSchema>;
