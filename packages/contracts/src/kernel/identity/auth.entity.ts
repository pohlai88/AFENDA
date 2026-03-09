import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";

export const AuthPortalValues = ["supplier", "customer"] as const;
export type AuthPortal = (typeof AuthPortalValues)[number];

export const AuthPasswordResetTokenSchema = z.object({
  id: z.string().uuid(),
  principalId: PrincipalIdSchema,
  tokenHash: z.string(),
  expiresAt: UtcDateTimeSchema,
  usedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type AuthPasswordResetToken = z.infer<typeof AuthPasswordResetTokenSchema>;

export const AuthPortalInvitationSchema = z.object({
  id: z.string().uuid(),
  orgId: OrgIdSchema,
  email: z.string().email(),
  portal: z.enum(AuthPortalValues),
  tokenHash: z.string(),
  invitedByPrincipalId: PrincipalIdSchema.nullable(),
  acceptedPrincipalId: PrincipalIdSchema.nullable(),
  expiresAt: UtcDateTimeSchema,
  acceptedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type AuthPortalInvitation = z.infer<typeof AuthPortalInvitationSchema>;
