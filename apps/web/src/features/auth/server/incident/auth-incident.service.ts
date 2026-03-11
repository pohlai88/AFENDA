import type { PortalType } from "@afenda/contracts";

import { publishAuthAuditEvent } from "../audit/audit.helpers";
import { AuthIncidentRepository } from "./auth-incident.repository";
import type {
  AcknowledgeAuthIncidentInput,
  AssignAuthIncidentInput,
  CreateAuthIncidentInput,
  ResolveAuthIncidentInput,
} from "./auth-incident.types";

const repository = new AuthIncidentRepository();

export async function createAuthIncident(input: CreateAuthIncidentInput) {
  const incident = await repository.create(input);

  await publishAuthAuditEvent("auth.signin.failure", {
    userId: input.relatedUserId,
    email: input.relatedEmail,
    tenantId: input.relatedTenantId,
    portal: input.relatedPortal as PortalType | undefined,
    errorCode: "SECURITY_INCIDENT_CREATED",
    metadata: {
      incidentId: incident.id,
      incidentCode: input.code,
      severity: input.severity,
    },
  });

  return incident;
}

export async function listRecentAuthIncidents(limit = 100) {
  return repository.listRecent(limit);
}

export async function getAuthIncidentById(id: string) {
  return repository.getById(id);
}

export async function acknowledgeAuthIncident(
  input: AcknowledgeAuthIncidentInput,
) {
  const ok = await repository.acknowledge(input);

  if (ok) {
    await publishAuthAuditEvent("auth.signin.failure", {
      userId: input.actorUserId,
      errorCode: "SECURITY_INCIDENT_ACKNOWLEDGED",
      metadata: {
        incidentId: input.incidentId,
      },
    });
  }

  return ok;
}

export async function assignAuthIncident(input: AssignAuthIncidentInput) {
  const ok = await repository.assign(input);

  if (ok) {
    await publishAuthAuditEvent("auth.signin.failure", {
      userId: input.actorUserId,
      errorCode: "SECURITY_INCIDENT_ASSIGNED",
      metadata: {
        incidentId: input.incidentId,
        assigneeUserId: input.assigneeUserId,
      },
    });
  }

  return ok;
}

export async function resolveAuthIncident(input: ResolveAuthIncidentInput) {
  const ok = await repository.resolve(input);

  if (ok) {
    await publishAuthAuditEvent("auth.signin.failure", {
      userId: input.actorUserId,
      errorCode: "SECURITY_INCIDENT_RESOLVED",
      metadata: {
        incidentId: input.incidentId,
        resolutionNote: input.resolutionNote,
      },
    });
  }

  return ok;
}
