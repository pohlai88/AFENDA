import type { AuthAnomalyFinding } from "../anomaly/auth-anomaly.types";
import type { AuthIncidentRecord } from "../incident/auth-incident.types";
import type { AuthSecurityMetrics } from "../metrics/auth-metrics.types";
import type {
  SecurityAuditEventListItem,
  SecurityChallengeListItem,
} from "../ops/auth-ops.types";

export interface AuthGovernanceSnapshot {
  metrics: AuthSecurityMetrics;
  anomalies: AuthAnomalyFinding[];
  activeChallenges: SecurityChallengeListItem[];
  recentAuditEvents: SecurityAuditEventListItem[];
  recentIncidents: AuthIncidentRecord[];
}
