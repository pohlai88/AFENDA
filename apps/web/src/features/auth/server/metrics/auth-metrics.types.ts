export interface AuthSecurityMetrics {
  activeChallenges: number;
  expiredUnpurgedChallenges: number;
  pendingAuditEvents: number;
  failedAuditEvents: number;
  recentSigninFailures: number;
  recentMfaFailures: number;
  recentResetFailures: number;
}
