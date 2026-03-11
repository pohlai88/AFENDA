/**
 * Auth write commands for self-service sign-up, password reset, and portal invitations.
 */
import { z } from "zod";
import { IdempotencyKeySchema } from "../execution/idempotency/request-key.js";

export const PortalTypeValues = ["app", "supplier", "customer", "cid", "investor", "franchisee", "contractor"] as const;
export type PortalType = (typeof PortalTypeValues)[number];
export const PortalTypeSchema = z.enum(PortalTypeValues);

export const PasswordResetDeliveryValues = ["auto", "link", "code"] as const;
export type PasswordResetDelivery = (typeof PasswordResetDeliveryValues)[number];
export const PasswordResetDeliverySchema = z.enum(PasswordResetDeliveryValues);

export const PasswordResetCredentialSchema = z.string().trim().refine(
  (value) => /^\d{6}$/.test(value) || value.length >= 16,
  {
    message: "Reset credential must be a 6-digit code or reset token",
  },
);

export const SignUpCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  fullName: z.string().trim().min(1).max(120),
  companyName: z.string().trim().min(1).max(160),
  email: z.string().email(),
  password: z.string().min(12).max(256),
});

export type SignUpCommand = z.infer<typeof SignUpCommandSchema>;

export const RequestPasswordResetCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  email: z.string().email(),
  delivery: PasswordResetDeliverySchema.optional(),
  redirectUrl: z.string().url().optional(),
});

export type RequestPasswordResetCommand = z.infer<typeof RequestPasswordResetCommandSchema>;

export const ResetPasswordCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  token: PasswordResetCredentialSchema,
  email: z.string().email().optional(),
  newPassword: z.string().min(12).max(256),
}).superRefine((value, ctx) => {
  const isCode = /^\d{6}$/.test(value.token);
  if (isCode && !value.email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["email"],
      message: "Email is required when using a 6-digit reset code",
    });
  }
});

export type ResetPasswordCommand = z.infer<typeof ResetPasswordCommandSchema>;

export const RequestPortalInvitationCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  email: z.string().email(),
  portal: PortalTypeSchema.refine((value) => value !== "app", {
    message: "Portal invitation requires supplier, customer, or cid portal",
  }),
  redirectUrl: z.string().url().optional(),
});

export type RequestPortalInvitationCommand = z.infer<typeof RequestPortalInvitationCommandSchema>;

export const AcceptPortalInvitationCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  token: z.string().min(16),
  fullName: z.string().trim().min(1).max(120),
  password: z.string().min(12).max(256),
});

export type AcceptPortalInvitationCommand = z.infer<typeof AcceptPortalInvitationCommandSchema>;

export const PublicAuthResultSchema = z.object({
  accepted: z.boolean(),
  message: z.string().min(1),
});

export type PublicAuthResult = z.infer<typeof PublicAuthResultSchema>;

/** Auth context request — email + portal for progressive auth discovery. */
export const AuthContextRequestSchema = z.object({
  email: z.string().email(),
  portal: PortalTypeSchema,
});

export type AuthContextRequest = z.infer<typeof AuthContextRequestSchema>;

/** Auth context response — drives SSO/Combobox/OTP UI. */
export const AuthContextResponseSchema = z.object({
  authMode: z.enum(["password", "sso"]),
  organizations: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
    }),
  ),
  mfaRequired: z.boolean(),
});

export type AuthContextResponse = z.infer<typeof AuthContextResponseSchema>;

// ── AuthFlowResult (API source of truth) ────────────────────────────────────────

/** Normalized result shape for all auth flow API endpoints. */
export const AuthFlowResultOkSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({ ok: z.literal(true), data: dataSchema });

export const AuthFlowResultErrSchema = z.object({
  ok: z.literal(false),
  code: z.string().min(1),
  message: z.string().min(1),
});

export type AuthFlowResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

/** Verify reset token request. */
export const VerifyResetTokenCommandSchema = z.object({
  token: PasswordResetCredentialSchema,
  email: z.string().email().optional(),
});

export type VerifyResetTokenCommand = z.infer<typeof VerifyResetTokenCommandSchema>;

/** Verify reset token success data. */
export const VerifyResetTokenDataSchema = z.object({
  email: z.string().email(),
  expiresAt: z.string().datetime().optional(),
});

export type VerifyResetTokenData = z.infer<typeof VerifyResetTokenDataSchema>;

/** Verify invite token request. */
export const VerifyInviteTokenCommandSchema = z.object({
  token: z.string().min(16),
});

export type VerifyInviteTokenCommand = z.infer<typeof VerifyInviteTokenCommandSchema>;

/** Verify invite token success data. */
export const VerifyInviteTokenDataSchema = z.object({
  email: z.string().email(),
  portal: z.enum(["supplier", "customer", "cid", "investor", "franchisee", "contractor"]),
  tenantName: z.string().min(1).optional(),
  tenantSlug: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

export type VerifyInviteTokenData = z.infer<typeof VerifyInviteTokenDataSchema>;

/** Verify MFA challenge request. */
export const VerifyMfaChallengeCommandSchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().min(6).max(8),
});

export type VerifyMfaChallengeCommand = z.infer<typeof VerifyMfaChallengeCommandSchema>;

/** Login (verify credentials) request. */
export const LoginCommandSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  portal: PortalTypeSchema.optional(),
});

export type LoginCommand = z.infer<typeof LoginCommandSchema>;

/** Login success data. */
export const LoginDataSchema = z.object({
  principalId: z.string().uuid(),
  email: z.string().email(),
});

export type LoginData = z.infer<typeof LoginDataSchema>;

/** Verify session grant request (one-time token from invite/MFA flow). */
export const VerifySessionGrantCommandSchema = z.object({
  grant: z.string().min(32),
});

export type VerifySessionGrantCommand = z.infer<typeof VerifySessionGrantCommandSchema>;

/** Verify session grant success data. */
export const VerifySessionGrantDataSchema = z.object({
  principalId: z.string().uuid(),
  email: z.string().email(),
  portal: z.string().min(1),
});

export type VerifySessionGrantData = z.infer<typeof VerifySessionGrantDataSchema>;
