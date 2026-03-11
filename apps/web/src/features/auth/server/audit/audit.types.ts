import type { PortalType } from "@afenda/contracts";

export type AuthAuditEventType =
  | "auth.signin.attempt"
  | "auth.signin.success"
  | "auth.signin.failure"
  | "auth.signin.mfa_required"
  | "auth.signup.attempt"
  | "auth.signup.success"
  | "auth.signup.failure"
  | "auth.mfa.success"
  | "auth.mfa.failure"
  | "auth.invite.token_verified"
  | "auth.invite.token_invalid"
  | "auth.invite.accepted"
  | "auth.invite.accept_failed"
  | "auth.reset.token_verified"
  | "auth.reset.token_invalid"
  | "auth.reset.completed"
  | "auth.reset.failed"
  | "auth.signout"
  | "auth.ops.challenge_revoked"
  | "auth.ops.outbox_retry"
  | "auth.ops.outbox_dead_letter"
  | "auth.ops.challenges_purged"
  | "auth.ops.session_revoked"
  | "auth.ops.anomaly_acknowledged"
  | "auth.session.jwt_revoked";

export interface AuthAuditContext {
  email?: string;
  userId?: string;
  tenantId?: string;
  tenantSlug?: string;
  portal?: PortalType;
  ipAddress?: string;
  userAgent?: string;
  callbackUrl?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthAuditEvent {
  type: AuthAuditEventType;
  context: AuthAuditContext;
}
