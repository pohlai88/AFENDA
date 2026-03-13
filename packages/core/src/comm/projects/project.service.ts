import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import {
  commProject,
  commProjectMember,
  commProjectMilestone,
  commProjectStatusHistory,
  outboxEvent,
} from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  ArchiveProjectCommand,
  CommProjectId,
  CommProjectMilestoneId,
  CorrelationId,
  CreateProjectCommand,
  CreateProjectMilestoneCommand,
  EntityId,
  PrincipalId,
  ProjectStatus,
  TransitionProjectStatusCommand,
  UpdateProjectCommand,
  AddProjectMemberCommand,
  RemoveProjectMemberCommand,
  CompleteProjectMilestoneCommand,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit";

export interface CommProjectPolicyContext {
  principalId: PrincipalId | null;
}

export type CommProjectServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type CommProjectServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommProjectServiceError };

const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  planning: ["active", "on_hold", "cancelled", "archived"],
  active: ["on_hold", "completed", "cancelled", "archived"],
  on_hold: ["active", "cancelled", "archived"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

function buildProjectNumber(): string {
  return `PRJ-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function buildMilestoneNumber(): string {
  return `MS-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function loadProjectStatus(
  db: DbClient,
  orgId: string,
  projectId: CommProjectId,
): Promise<{ id: string; status: ProjectStatus } | null> {
  const [row] = await db
    .select({ id: commProject.id, status: commProject.status })
    .from(commProject)
    .where(and(eq(commProject.orgId, orgId), eq(commProject.id, projectId)));

  if (!row) return null;
  return { id: row.id, status: row.status as ProjectStatus };
}

export async function createProject(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommProjectPolicyContext,
  correlationId: CorrelationId,
  params: CreateProjectCommand,
): Promise<CommProjectServiceResult<{ id: CommProjectId; projectNumber: string }>> {
  const orgId = ctx.activeContext.orgId;
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: {
        code: "IAM_PRINCIPAL_NOT_FOUND",
        message: "Authenticated principal is required",
      },
    };
  }
  const principalId = policyCtx.principalId;
  const projectNumber = buildProjectNumber();

  const auditEntry: {
    actorPrincipalId: PrincipalId;
    action: "project.created";
    entityType: "project";
    entityId?: EntityId;
    correlationId: CorrelationId;
    details: {
      projectNumber: string;
      name: string;
      visibility: string;
    };
  } = {
    actorPrincipalId: principalId,
    action: "project.created",
    entityType: "project",
    correlationId,
    details: {
      projectNumber,
      name: params.name,
      visibility: params.visibility ?? "org",
    },
  };

  const created = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(commProject)
      .values({
        orgId,
        projectNumber,
        name: params.name,
        description: params.description ?? null,
        status: "planning",
        visibility: params.visibility ?? "org",
        ownerId: principalId,
        startDate: params.startDate ?? null,
        targetDate: params.targetDate ?? null,
        color: params.color ?? null,
      })
      .returning({ id: commProject.id, projectNumber: commProject.projectNumber });

    if (!row) throw new Error("Failed to create project");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "COMM.PROJECT_CREATED",
      version: "1",
      correlationId,
      payload: {
        projectId: row.id,
        projectNumber: row.projectNumber,
        name: params.name,
        ownerId: principalId,
      },
    });

    return row;
  });

  return {
    ok: true,
    data: { id: created.id as CommProjectId, projectNumber: created.projectNumber },
  };
}

export async function updateProject(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommProjectPolicyContext,
  correlationId: CorrelationId,
  params: UpdateProjectCommand,
): Promise<CommProjectServiceResult<{ id: CommProjectId }>> {
  const orgId = ctx.activeContext.orgId;
  const existing = await loadProjectStatus(db, orgId, params.projectId);
  if (!existing) {
    return {
      ok: false,
      error: {
        code: "COMM_PROJECT_NOT_FOUND",
        message: "Project not found",
        meta: { projectId: params.projectId },
      },
    };
  }

  const updateSet: {
    name?: string;
    description?: string | null;
    visibility?: UpdateProjectCommand["visibility"];
    startDate?: string | null;
    targetDate?: string | null;
    color?: string | null;
    updatedAt: ReturnType<typeof sql>;
  } = {
    updatedAt: sql`now()`,
  };

  if (params.name !== undefined) updateSet.name = params.name;
  if (params.description !== undefined) updateSet.description = params.description;
  if (params.visibility !== undefined) updateSet.visibility = params.visibility;
  if (params.startDate !== undefined) updateSet.startDate = params.startDate;
  if (params.targetDate !== undefined) updateSet.targetDate = params.targetDate;
  if (params.color !== undefined) updateSet.color = params.color;

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "project.updated",
      entityType: "project",
      entityId: params.projectId as unknown as EntityId,
      correlationId,
      details: { projectId: params.projectId },
    },
    async (tx) => {
      await tx
        .update(commProject)
        .set(updateSet)
        .where(and(eq(commProject.orgId, orgId), eq(commProject.id, params.projectId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.PROJECT_UPDATED",
        version: "1",
        correlationId,
        payload: {
          projectId: params.projectId,
        },
      });
    },
  );

  return { ok: true, data: { id: params.projectId } };
}

export async function transitionProjectStatus(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommProjectPolicyContext,
  correlationId: CorrelationId,
  params: TransitionProjectStatusCommand,
): Promise<CommProjectServiceResult<{ id: CommProjectId; status: ProjectStatus }>> {
  const orgId = ctx.activeContext.orgId;
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: {
        code: "IAM_PRINCIPAL_NOT_FOUND",
        message: "Authenticated principal is required",
      },
    };
  }
  const principalId = policyCtx.principalId;

  const existing = await loadProjectStatus(db, orgId, params.projectId);
  if (!existing) {
    return {
      ok: false,
      error: {
        code: "COMM_PROJECT_NOT_FOUND",
        message: "Project not found",
        meta: { projectId: params.projectId },
      },
    };
  }

  const allowed = PROJECT_STATUS_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(params.toStatus)) {
    return {
      ok: false,
      error: {
        code: "COMM_PROJECT_INVALID_STATUS_TRANSITION",
        message: "Invalid project status transition",
        meta: {
          projectId: params.projectId,
          fromStatus: existing.status,
          toStatus: params.toStatus,
        },
      },
    };
  }

  const completedAtValue = params.toStatus === "completed" ? sql`now()` : null;

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: params.toStatus === "archived" ? "project.archived" : "project.status_changed",
      entityType: "project",
      entityId: params.projectId as unknown as EntityId,
      correlationId,
      details: {
        projectId: params.projectId,
        fromStatus: existing.status,
        toStatus: params.toStatus,
        reason: params.reason ?? null,
      },
    },
    async (tx) => {
      await tx
        .update(commProject)
        .set({
          status: params.toStatus,
          completedAt: completedAtValue,
          updatedAt: sql`now()`,
        })
        .where(and(eq(commProject.orgId, orgId), eq(commProject.id, params.projectId)));

      await tx.insert(commProjectStatusHistory).values({
        orgId,
        projectId: params.projectId,
        fromStatus: existing.status,
        toStatus: params.toStatus,
        changedByPrincipalId: principalId,
        reason: params.reason ?? null,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.PROJECT_STATUS_CHANGED",
        version: "1",
        correlationId,
        payload: {
          projectId: params.projectId,
          fromStatus: existing.status,
          toStatus: params.toStatus,
          reason: params.reason ?? null,
        },
      });
    },
  );

  return { ok: true, data: { id: params.projectId, status: params.toStatus } };
}

export async function archiveProject(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommProjectPolicyContext,
  correlationId: CorrelationId,
  params: ArchiveProjectCommand,
): Promise<CommProjectServiceResult<{ id: CommProjectId; status: ProjectStatus }>> {
  return transitionProjectStatus(db, ctx, policyCtx, correlationId, {
    idempotencyKey: params.idempotencyKey,
    projectId: params.projectId,
    toStatus: "archived",
    reason: params.reason,
  });
}

export async function addProjectMember(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommProjectPolicyContext,
  correlationId: CorrelationId,
  params: AddProjectMemberCommand,
): Promise<CommProjectServiceResult<{ id: CommProjectId; principalId: PrincipalId }>> {
  const orgId = ctx.activeContext.orgId;

  const project = await loadProjectStatus(db, orgId, params.projectId);
  if (!project) {
    return {
      ok: false,
      error: {
        code: "COMM_PROJECT_NOT_FOUND",
        message: "Project not found",
        meta: { projectId: params.projectId },
      },
    };
  }

  const [existingMember] = await db
    .select({ id: commProjectMember.id })
    .from(commProjectMember)
    .where(
      and(
        eq(commProjectMember.orgId, orgId),
        eq(commProjectMember.projectId, params.projectId),
        eq(commProjectMember.principalId, params.principalId),
      ),
    );

  if (existingMember) {
    return {
      ok: false,
      error: {
        code: "COMM_PROJECT_MEMBER_ALREADY_EXISTS",
        message: "Project member already exists",
        meta: { projectId: params.projectId, principalId: params.principalId },
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "project.member_added",
      entityType: "project_member",
      entityId: params.projectId as unknown as EntityId,
      correlationId,
      details: {
        projectId: params.projectId,
        principalId: params.principalId,
        role: params.role,
      },
    },
    async (tx) => {
      await tx.insert(commProjectMember).values({
        orgId,
        projectId: params.projectId,
        principalId: params.principalId,
        role: params.role,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.PROJECT_MEMBER_ADDED",
        version: "1",
        correlationId,
        payload: {
          projectId: params.projectId,
          principalId: params.principalId,
          role: params.role,
        },
      });
    },
  );

  return { ok: true, data: { id: params.projectId, principalId: params.principalId } };
}

export async function removeProjectMember(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommProjectPolicyContext,
  correlationId: CorrelationId,
  params: RemoveProjectMemberCommand,
): Promise<CommProjectServiceResult<{ id: CommProjectId; principalId: PrincipalId }>> {
  const orgId = ctx.activeContext.orgId;

  const [existingMember] = await db
    .select({ id: commProjectMember.id })
    .from(commProjectMember)
    .where(
      and(
        eq(commProjectMember.orgId, orgId),
        eq(commProjectMember.projectId, params.projectId),
        eq(commProjectMember.principalId, params.principalId),
      ),
    );

  if (!existingMember) {
    return {
      ok: false,
      error: {
        code: "COMM_PROJECT_MEMBER_NOT_FOUND",
        message: "Project member not found",
        meta: { projectId: params.projectId, principalId: params.principalId },
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "project.member_removed",
      entityType: "project_member",
      entityId: params.projectId as unknown as EntityId,
      correlationId,
      details: {
        projectId: params.projectId,
        principalId: params.principalId,
      },
    },
    async (tx) => {
      await tx
        .delete(commProjectMember)
        .where(
          and(
            eq(commProjectMember.orgId, orgId),
            eq(commProjectMember.projectId, params.projectId),
            eq(commProjectMember.principalId, params.principalId),
          ),
        );

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.PROJECT_MEMBER_REMOVED",
        version: "1",
        correlationId,
        payload: {
          projectId: params.projectId,
          principalId: params.principalId,
        },
      });
    },
  );

  return { ok: true, data: { id: params.projectId, principalId: params.principalId } };
}

export async function createProjectMilestone(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommProjectPolicyContext,
  correlationId: CorrelationId,
  params: CreateProjectMilestoneCommand,
): Promise<CommProjectServiceResult<{ id: CommProjectMilestoneId; milestoneNumber: string }>> {
  const orgId = ctx.activeContext.orgId;

  const project = await loadProjectStatus(db, orgId, params.projectId);
  if (!project) {
    return {
      ok: false,
      error: {
        code: "COMM_PROJECT_NOT_FOUND",
        message: "Project not found",
        meta: { projectId: params.projectId },
      },
    };
  }

  const milestoneNumber = buildMilestoneNumber();

  const auditEntry: {
    actorPrincipalId: PrincipalId | null | undefined;
    action: "project.milestone_created";
    entityType: "project_milestone";
    entityId?: EntityId;
    correlationId: CorrelationId;
    details: {
      projectId: CommProjectId;
      milestoneNumber: string;
      name: string;
    };
  } = {
    actorPrincipalId: policyCtx.principalId,
    action: "project.milestone_created",
    entityType: "project_milestone",
    correlationId,
    details: {
      projectId: params.projectId,
      milestoneNumber,
      name: params.name,
    },
  };

  const created = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(commProjectMilestone)
      .values({
        orgId,
        projectId: params.projectId,
        milestoneNumber,
        name: params.name,
        description: params.description ?? null,
        status: "planned",
        targetDate: params.targetDate,
      })
      .returning({
        id: commProjectMilestone.id,
        milestoneNumber: commProjectMilestone.milestoneNumber,
      });

    if (!row) throw new Error("Failed to create project milestone");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "COMM.PROJECT_MILESTONE_CREATED",
      version: "1",
      correlationId,
      payload: {
        projectId: params.projectId,
        milestoneId: row.id,
        milestoneNumber: row.milestoneNumber,
        name: params.name,
      },
    });

    return row;
  });

  return {
    ok: true,
    data: {
      id: created.id as CommProjectMilestoneId,
      milestoneNumber: created.milestoneNumber,
    },
  };
}

export async function completeProjectMilestone(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommProjectPolicyContext,
  correlationId: CorrelationId,
  params: CompleteProjectMilestoneCommand,
): Promise<CommProjectServiceResult<{ id: CommProjectMilestoneId; status: "completed" }>> {
  const orgId = ctx.activeContext.orgId;

  const [existing] = await db
    .select({ id: commProjectMilestone.id, status: commProjectMilestone.status })
    .from(commProjectMilestone)
    .where(
      and(eq(commProjectMilestone.orgId, orgId), eq(commProjectMilestone.id, params.milestoneId)),
    );

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "COMM_PROJECT_MILESTONE_NOT_FOUND",
        message: "Project milestone not found",
        meta: { milestoneId: params.milestoneId },
      },
    };
  }

  if (existing.status === "completed") {
    return {
      ok: false,
      error: {
        code: "COMM_PROJECT_MILESTONE_ALREADY_COMPLETED",
        message: "Project milestone already completed",
        meta: { milestoneId: params.milestoneId },
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "project.milestone_completed",
      entityType: "project_milestone",
      entityId: params.milestoneId as unknown as EntityId,
      correlationId,
      details: {
        milestoneId: params.milestoneId,
      },
    },
    async (tx) => {
      await tx
        .update(commProjectMilestone)
        .set({
          status: "completed",
          completedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(commProjectMilestone.orgId, orgId),
            eq(commProjectMilestone.id, params.milestoneId),
          ),
        );

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.PROJECT_MILESTONE_COMPLETED",
        version: "1",
        correlationId,
        payload: {
          milestoneId: params.milestoneId,
        },
      });
    },
  );

  return { ok: true, data: { id: params.milestoneId, status: "completed" } };
}
