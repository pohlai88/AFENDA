import { getAuthIncidentById } from "./auth-incident.service";
import {
  getRecentSecurityAuditEvents,
  getRecentSecurityChallenges,
} from "../ops/auth-ops.service";

export async function exportAuthIncidentEvidence(incidentId: string) {
  const incident = await getAuthIncidentById(incidentId);
  if (!incident) return null;

  const [auditEvents, challenges] = await Promise.all([
    getRecentSecurityAuditEvents(200),
    getRecentSecurityChallenges(200),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    incident,
    relatedAuditEvents: auditEvents.filter(
      (event) =>
        event.aggregateId === incident.relatedUserId ||
        event.aggregateId === incident.relatedEmail,
    ),
    relatedChallenges: challenges.filter(
      (challenge) =>
        challenge.userId === incident.relatedUserId ||
        challenge.email === incident.relatedEmail,
    ),
  };
}
