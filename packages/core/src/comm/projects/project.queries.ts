import type { DbClient } from "@afenda/db";
import { commProject, commProjectMember, commProjectMilestone, commProjectPhase } from "@afenda/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import type {
  CommProjectId,
  PrincipalId,
  ProjectStatus,
  ProjectVisibility,
} from "@afenda/contracts";

export interface ProjectRow {
  id: CommProjectId;
  orgId: string;
  projectNumber: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  ownerId: PrincipalId;
  startDate: string | null;
  targetDate: string | null;
  completedAt: Date | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectListParams {
  orgId: string;
  statuses?: ProjectStatus[];
  ownerId?: PrincipalId;
  visibility?: ProjectVisibility;
  limit?: number;
}

export async function getProjectById(
  db: DbClient,
  orgId: string,
  projectId: CommProjectId,
): Promise<ProjectRow | null> {
  const [row] = await db
    .select()
    .from(commProject)
    .where(and(eq(commProject.orgId, orgId), eq(commProject.id, projectId)));

  if (!row) return null;

  return row as ProjectRow;
}

export async function listProjects(db: DbClient, params: ProjectListParams): Promise<ProjectRow[]> {
  const limit = params.limit ?? 100;

  const filters = [eq(commProject.orgId, params.orgId)];

  if (params.ownerId) {
    filters.push(eq(commProject.ownerId, params.ownerId));
  }

  if (params.visibility) {
    filters.push(eq(commProject.visibility, params.visibility));
  }

  if (params.statuses && params.statuses.length > 0) {
    filters.push(inArray(commProject.status, params.statuses));
  }

  const rows = await db
    .select()
    .from(commProject)
    .where(and(...filters))
    .orderBy(desc(commProject.updatedAt), desc(commProject.createdAt))
    .limit(limit);

  return rows as ProjectRow[];
}

export async function listProjectMembers(db: DbClient, orgId: string, projectId: CommProjectId) {
  return db
    .select()
    .from(commProjectMember)
    .where(and(eq(commProjectMember.orgId, orgId), eq(commProjectMember.projectId, projectId)));
}

export async function listProjectMilestones(db: DbClient, orgId: string, projectId: CommProjectId) {
  return db
    .select()
    .from(commProjectMilestone)
    .where(
      and(eq(commProjectMilestone.orgId, orgId), eq(commProjectMilestone.projectId, projectId)),
    )
    .orderBy(commProjectMilestone.targetDate, commProjectMilestone.createdAt);
}

export async function listProjectPhases(db: DbClient, orgId: string, projectId: CommProjectId) {
  return db
    .select()
    .from(commProjectPhase)
    .where(and(eq(commProjectPhase.orgId, orgId), eq(commProjectPhase.projectId, projectId)))
    .orderBy(commProjectPhase.sequenceOrder, commProjectPhase.createdAt);
}
