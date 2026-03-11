export type AuthIncidentSeverity = "low" | "medium" | "high" | "critical";

export type AuthIncidentStatus =
  | "open"
  | "acknowledged"
  | "investigating"
  | "contained"
  | "resolved"
  | "closed";

export interface AuthIncidentRecord {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  severity: AuthIncidentSeverity;
  status: AuthIncidentStatus;

  relatedUserId?: string | null;
  relatedEmail?: string | null;
  relatedTenantId?: string | null;
  relatedPortal?: string | null;

  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;

  assignedTo?: string | null;
  assignedAt?: string | null;

  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;

  metadata?: Record<string, unknown> | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAuthIncidentInput {
  code: string;
  title: string;
  description?: string;
  severity: AuthIncidentSeverity;
  relatedUserId?: string;
  relatedEmail?: string;
  relatedTenantId?: string;
  relatedPortal?: string;
  metadata?: Record<string, unknown>;
}

export interface AcknowledgeAuthIncidentInput {
  incidentId: string;
  actorUserId: string;
}

export interface AssignAuthIncidentInput {
  incidentId: string;
  actorUserId: string;
  assigneeUserId: string;
}

export interface ResolveAuthIncidentInput {
  incidentId: string;
  actorUserId: string;
  resolutionNote: string;
}
