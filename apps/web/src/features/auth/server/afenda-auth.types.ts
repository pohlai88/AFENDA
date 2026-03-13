import type { PortalType } from "@afenda/contracts";

/** Normalized result shape — mirrors AFENDA API AuthFlowResult. */
export type AuthFlowResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

// ── Input types ─────────────────────────────────────────────────────────────

export interface VerifyCredentialsInput {
  email: string;
  password: string;
  portal?: PortalType;
  ipAddress?: string;
  userAgent?: string;
}

export interface VerifyMfaInput {
  mfaToken: string;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AcceptInviteInput {
  token: string;
  name: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SignUpInput {
  fullName: string;
  companyName: string;
  email: string;
  password: string;
}

export type SignUpResult = AuthFlowResult<{
  principalId: string;
  email: string;
  orgSlug: string;
}>;

// ── Result types (mirror API semantics) ─────────────────────────────────────

export type VerifyCredentialsResult = AuthFlowResult<{
  principalId: string;
  email: string;
  requiresMfa?: boolean;
}>;

export type VerifyResetTokenResult = AuthFlowResult<{
  email: string;
  expiresAt?: string;
}>;

export type ActionResult = AuthFlowResult<{ message: string }>;

export type VerifyInviteTokenResult = AuthFlowResult<{
  email: string;
  portal: Exclude<PortalType, "app">;
  tenantName?: string;
  tenantSlug?: string;
  expiresAt?: string;
}>;

export type AcceptInviteResult = AuthFlowResult<{
  email: string;
  portal: Exclude<PortalType, "app">;
  sessionGrant: string;
}>;

export type VerifyMfaResult = AuthFlowResult<{
  principalId: string;
  email: string;
  sessionGrant: string;
}>;

// ── Session user ───────────────────────────────────────────────────────────────

export interface AfendaAuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;

  tenantId: string;
  tenantSlug: string;

  portal: PortalType;
  roles: string[];
  permissions: string[];

  requiresMfa?: boolean;
  mfaToken?: string | null;

  accessToken?: string | null;
  refreshToken?: string | null;
}

// ── Service contract ────────────────────────────────────────────────────────

export interface AfendaAuthService {
  verifyCredentials(input: VerifyCredentialsInput): Promise<VerifyCredentialsResult>;
  verifyResetToken(input: { token: string }): Promise<VerifyResetTokenResult>;
  resetPassword(input: ResetPasswordInput): Promise<ActionResult>;
  verifyInviteToken(input: { token: string }): Promise<VerifyInviteTokenResult>;
  acceptInvite(input: AcceptInviteInput): Promise<AcceptInviteResult>;
  verifyMfaChallenge(input: VerifyMfaInput): Promise<VerifyMfaResult>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
}
