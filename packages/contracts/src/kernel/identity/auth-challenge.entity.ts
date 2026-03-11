/**
 * Auth challenge entity — shared types for MFA, invite, and reset flows.
 * Used by both web (store interface) and core (repository).
 */

import type { PortalType } from "./auth.commands.js";

export type AuthChallengeType = "mfa" | "invite" | "reset";

export interface AuthChallengeRecord {
  id: string;
  type: AuthChallengeType;
  tokenHash: string;
  tokenHint?: string | null;
  email?: string | null;
  portal?: PortalType | null;
  callbackUrl?: string | null;
  tenantId?: string | null;
  tenantSlug?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt?: string | null;
  expiresAt: string;
  consumedAt?: string | null;
  revoked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAuthChallengeInput {
  type: AuthChallengeType;
  rawToken: string;
  email?: string;
  portal?: PortalType;
  callbackUrl?: string;
  tenantId?: string;
  tenantSlug?: string;
  userId?: string;
  expiresAt: string;
  metadata?: Record<string, unknown>;
  maxAttempts?: number;
}

export interface ConsumeChallengeResult {
  ok: boolean;
  reason?:
    | "not_found"
    | "expired"
    | "revoked"
    | "already_consumed"
    | "max_attempts_exceeded"
    | "type_mismatch";
  challenge?: AuthChallengeRecord;
}

export interface FailedAttemptResult {
  ok: boolean;
  challenge?: AuthChallengeRecord;
}
