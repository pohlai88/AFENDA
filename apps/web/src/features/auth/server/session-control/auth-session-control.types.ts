export interface RevokeSessionsInput {
  actorUserId: string;
  targetUserId?: string;
  tenantId?: string;
  portal?: string;
  reason: string;
}
