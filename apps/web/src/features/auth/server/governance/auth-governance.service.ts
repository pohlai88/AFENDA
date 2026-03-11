import { detectAuthAnomalies } from "../anomaly/auth-anomaly.service";
import {
  createAuthIncident,
  listRecentAuthIncidents,
} from "../incident/auth-incident.service";
import { getAuthSecurityMetrics } from "../metrics/auth-metrics.service";
import {
  getActiveSecurityChallenges,
  getRecentSecurityAuditEvents,
} from "../ops/auth-ops.service";

import type { AuthGovernanceSnapshot } from "./auth-governance.types";

export async function getAuthGovernanceSnapshot(): Promise<AuthGovernanceSnapshot> {
  const [metrics, anomalies, activeChallenges, recentAuditEvents, recentIncidents] =
    await Promise.all([
      getAuthSecurityMetrics(),
      detectAuthAnomalies(),
      getActiveSecurityChallenges(25),
      getRecentSecurityAuditEvents(25),
      listRecentAuthIncidents(25),
    ]);

  return {
    metrics,
    anomalies,
    activeChallenges,
    recentAuditEvents,
    recentIncidents,
  };
}

/**
 * Bridge from anomaly detection to operator workflow.
 * Creates incidents for each detected anomaly finding.
 */
export async function materializeAuthAnomaliesAsIncidents(): Promise<void> {
  const findings = await detectAuthAnomalies();

  for (const finding of findings) {
    await createAuthIncident({
      code: finding.code,
      title: finding.message,
      severity:
        finding.severity === "high"
          ? "high"
          : finding.severity === "medium"
            ? "medium"
            : "low",
      metadata: {
        value: finding.value,
        threshold: finding.threshold,
      },
    });
  }
}
