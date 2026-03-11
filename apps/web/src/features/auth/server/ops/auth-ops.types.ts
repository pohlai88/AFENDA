import type { PortalType } from "@afenda/contracts";

export interface SecurityChallengeListItem {
  id: string;
  type: "mfa" | "invite" | "reset";
  tokenHint?: string | null;
  email?: string | null;
  portal?: PortalType | null;
  tenantId?: string | null;
  tenantSlug?: string | null;
  userId?: string | null;
  attemptCount: number;
  maxAttempts: number;
  expiresAt: string;
  consumedAt?: string | null;
  revoked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityAuditEventListItem {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId?: string | null;
  status: string;
  attemptCount: number;
  availableAt: string;
  processedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface RevokeChallengeInput {
  rawToken?: string;
  challengeId?: string;
  reason: string;
  actorUserId?: string;
}
