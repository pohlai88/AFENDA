import { desc, eq, sql } from "drizzle-orm";
import { authIncidents } from "@afenda/db";

import { getDbForAuth } from "../auth-db";
import type {
  AcknowledgeAuthIncidentInput,
  AssignAuthIncidentInput,
  AuthIncidentRecord,
  CreateAuthIncidentInput,
  ResolveAuthIncidentInput,
} from "./auth-incident.types";

function mapRow(row: (typeof authIncidents.$inferSelect)): AuthIncidentRecord {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    severity: row.severity as AuthIncidentRecord["severity"],
    status: row.status as AuthIncidentRecord["status"],
    relatedUserId: row.relatedUserId,
    relatedEmail: row.relatedEmail,
    relatedTenantId: row.relatedTenantId,
    relatedPortal: row.relatedPortal,
    acknowledgedBy: row.acknowledgedBy,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    assignedTo: row.assignedTo,
    assignedAt: row.assignedAt?.toISOString() ?? null,
    resolvedBy: row.resolvedBy,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolutionNote: row.resolutionNote,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class AuthIncidentRepository {
  private get db() {
    return getDbForAuth();
  }

  async create(input: CreateAuthIncidentInput): Promise<AuthIncidentRecord> {
    const [row] = await this.db
      .insert(authIncidents)
      .values({
        code: input.code,
        title: input.title,
        description: input.description ?? null,
        severity: input.severity,
        status: "open",
        relatedUserId: input.relatedUserId ?? null,
        relatedEmail: input.relatedEmail ?? null,
        relatedTenantId: input.relatedTenantId ?? null,
        relatedPortal: input.relatedPortal ?? null,
        metadata: input.metadata ?? null,
      })
      .returning();

    if (!row) throw new Error("Auth incident insert failed");
    return mapRow(row);
  }

  async getById(id: string): Promise<AuthIncidentRecord | null> {
    const [row] = await this.db
      .select()
      .from(authIncidents)
      .where(eq(authIncidents.id, id))
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async listRecent(limit = 100): Promise<AuthIncidentRecord[]> {
    const rows = await this.db
      .select()
      .from(authIncidents)
      .orderBy(desc(authIncidents.createdAt))
      .limit(limit);

    return rows.map(mapRow);
  }

  async acknowledge(input: AcknowledgeAuthIncidentInput): Promise<boolean> {
    const rows = await this.db
      .update(authIncidents)
      .set({
        status: "acknowledged",
        acknowledgedBy: input.actorUserId,
        acknowledgedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(authIncidents.id, input.incidentId))
      .returning({ id: authIncidents.id });

    return rows.length > 0;
  }

  async assign(input: AssignAuthIncidentInput): Promise<boolean> {
    const rows = await this.db
      .update(authIncidents)
      .set({
        status: "investigating",
        assignedTo: input.assigneeUserId,
        assignedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(authIncidents.id, input.incidentId))
      .returning({ id: authIncidents.id });

    return rows.length > 0;
  }

  async resolve(input: ResolveAuthIncidentInput): Promise<boolean> {
    const rows = await this.db
      .update(authIncidents)
      .set({
        status: "resolved",
        resolvedBy: input.actorUserId,
        resolvedAt: sql`now()`,
        resolutionNote: input.resolutionNote,
        updatedAt: sql`now()`,
      })
      .where(eq(authIncidents.id, input.incidentId))
      .returning({ id: authIncidents.id });

    return rows.length > 0;
  }
}
