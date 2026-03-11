import { getAcknowledgedAnomalyCodes } from "../ops/anomaly-ack.service";
import { getAuthSecurityMetrics } from "../metrics/auth-metrics.service";
import type { AuthAnomalyFinding } from "./auth-anomaly.types";

export interface DetectAuthAnomaliesOptions {
  /** When false (default), filter out acknowledged anomalies. */
  includeAcknowledged?: boolean;
}

export async function detectAuthAnomalies(
  options: DetectAuthAnomaliesOptions = {},
): Promise<AuthAnomalyFinding[]> {
  const { includeAcknowledged = false } = options;
  const metrics = await getAuthSecurityMetrics();
  const findings: AuthAnomalyFinding[] = [];

  if (metrics.recentSigninFailures >= 50) {
    findings.push({
      code: "high_signin_failure_volume",
      severity: "high",
      message: "Sign-in failures in the last 24 hours are abnormally high.",
      value: metrics.recentSigninFailures,
      threshold: 50,
    });
  }

  if (metrics.recentMfaFailures >= 20) {
    findings.push({
      code: "high_mfa_failure_volume",
      severity: "medium",
      message: "MFA verification failures in the last 24 hours are elevated.",
      value: metrics.recentMfaFailures,
      threshold: 20,
    });
  }

  if (metrics.failedAuditEvents >= 10) {
    findings.push({
      code: "failed_audit_backlog",
      severity: "high",
      message: "Failed audit outbox events require operator review.",
      value: metrics.failedAuditEvents,
      threshold: 10,
    });
  }

  if (metrics.expiredUnpurgedChallenges >= 100) {
    findings.push({
      code: "expired_challenge_backlog",
      severity: "medium",
      message: "Expired auth challenges are accumulating and should be purged.",
      value: metrics.expiredUnpurgedChallenges,
      threshold: 100,
    });
  }

  if (!includeAcknowledged && findings.length > 0) {
    const acknowledged = await getAcknowledgedAnomalyCodes();
    return findings.filter((f) => !acknowledged.has(f.code));
  }

  return findings;
}
