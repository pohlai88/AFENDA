import type { DbClient } from "@afenda/db";
import { commLabel, commLabelAssignment, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  AssignLabelCommand,
  CommLabelEntityType,
  CommLabelId,
  CorrelationId,
  CreateLabelCommand,
  DeleteLabelCommand,
  EntityId,
  PrincipalId,
  UnassignLabelCommand,
  UpdateLabelCommand,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit";
import { getLabelById } from "./label.queries";

export interface CommLabelPolicyContext {
  principalId: PrincipalId | null;
}

export type CommLabelServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type CommLabelServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommLabelServiceError };

async function getAssignmentByUnique(
  db: DbClient,
  orgId: string,
  labelId: CommLabelId,
  entityType: CommLabelEntityType,
  entityId: string,
): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: commLabelAssignment.id })
    .from(commLabelAssignment)
    .where(
      and(
        eq(commLabelAssignment.orgId, orgId),
        eq(commLabelAssignment.labelId, labelId),
        eq(commLabelAssignment.entityType, entityType),
        eq(commLabelAssignment.entityId, entityId),
      ),
    );

  return row ?? null;
}

export async function createLabel(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommLabelPolicyContext,
  correlationId: CorrelationId,
  params: CreateLabelCommand,
): Promise<CommLabelServiceResult<{ id: CommLabelId }>> {
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

  const orgId = ctx.activeContext.orgId;

  const created = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "label.created",
      entityType: "label",
      correlationId,
      details: { name: params.name, color: params.color },
    },
    async (tx) => {
      const [row] = await tx
        .insert(commLabel)
        .values({
          orgId,
          name: params.name,
          color: params.color,
          createdByPrincipalId: principalId,
        })
        .returning({ id: commLabel.id });

      if (!row) throw new Error("Failed to create label");

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.LABEL_CREATED",
        version: "1",
        correlationId,
        payload: {
          labelId: row.id,
          name: params.name,
          color: params.color,
        },
      });

      return row;
    },
  );

  return { ok: true, data: { id: created.id as CommLabelId } };
}

export async function updateLabel(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommLabelPolicyContext,
  correlationId: CorrelationId,
  params: UpdateLabelCommand,
): Promise<CommLabelServiceResult<{ id: CommLabelId }>> {
  const orgId = ctx.activeContext.orgId;
  const existing = await getLabelById(db, orgId, params.labelId);

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "COMM_LABEL_NOT_FOUND",
        message: "Label not found",
        meta: { labelId: params.labelId },
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "label.updated",
      entityType: "label",
      entityId: params.labelId as unknown as EntityId,
      correlationId,
      details: { labelId: params.labelId },
    },
    async (tx) => {
      await tx
        .update(commLabel)
        .set({
          name: params.name,
          color: params.color,
          updatedAt: sql`now()`,
        })
        .where(and(eq(commLabel.orgId, orgId), eq(commLabel.id, params.labelId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.LABEL_UPDATED",
        version: "1",
        correlationId,
        payload: {
          labelId: params.labelId,
          name: params.name ?? existing.name,
          color: params.color ?? existing.color,
        },
      });
    },
  );

  return { ok: true, data: { id: params.labelId } };
}

export async function deleteLabel(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommLabelPolicyContext,
  correlationId: CorrelationId,
  params: DeleteLabelCommand,
): Promise<CommLabelServiceResult<{ id: CommLabelId }>> {
  const orgId = ctx.activeContext.orgId;
  const existing = await getLabelById(db, orgId, params.labelId);

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "COMM_LABEL_NOT_FOUND",
        message: "Label not found",
        meta: { labelId: params.labelId },
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "label.deleted",
      entityType: "label",
      entityId: params.labelId as unknown as EntityId,
      correlationId,
      details: { labelId: params.labelId },
    },
    async (tx) => {
      await tx
        .delete(commLabel)
        .where(and(eq(commLabel.orgId, orgId), eq(commLabel.id, params.labelId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.LABEL_DELETED",
        version: "1",
        correlationId,
        payload: {
          labelId: params.labelId,
        },
      });
    },
  );

  return { ok: true, data: { id: params.labelId } };
}

export async function assignLabel(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommLabelPolicyContext,
  correlationId: CorrelationId,
  params: AssignLabelCommand,
): Promise<CommLabelServiceResult<{ id: string }>> {
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

  const orgId = ctx.activeContext.orgId;
  const label = await getLabelById(db, orgId, params.labelId);
  if (!label) {
    return {
      ok: false,
      error: {
        code: "COMM_LABEL_NOT_FOUND",
        message: "Label not found",
        meta: { labelId: params.labelId },
      },
    };
  }

  const existingAssignment = await getAssignmentByUnique(
    db,
    orgId,
    params.labelId,
    params.entityType,
    params.entityId,
  );

  if (existingAssignment) {
    return { ok: true, data: { id: existingAssignment.id } };
  }

  const created = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "label.assigned",
      entityType: "label_assignment",
      correlationId,
      details: {
        labelId: params.labelId,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    },
    async (tx) => {
      const [row] = await tx
        .insert(commLabelAssignment)
        .values({
          orgId,
          labelId: params.labelId,
          entityType: params.entityType,
          entityId: params.entityId,
          assignedByPrincipalId: principalId,
        })
        .returning({ id: commLabelAssignment.id });

      if (!row) throw new Error("Failed to assign label");

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.LABEL_ASSIGNED",
        version: "1",
        correlationId,
        payload: {
          assignmentId: row.id,
          labelId: params.labelId,
          entityType: params.entityType,
          entityId: params.entityId,
        },
      });

      return row;
    },
  );

  return { ok: true, data: { id: (created as { id: string }).id } };
}

export async function unassignLabel(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommLabelPolicyContext,
  correlationId: CorrelationId,
  params: UnassignLabelCommand,
): Promise<CommLabelServiceResult<{ id: string }>> {
  const orgId = ctx.activeContext.orgId;

  const existingAssignment = await getAssignmentByUnique(
    db,
    orgId,
    params.labelId,
    params.entityType,
    params.entityId,
  );

  if (!existingAssignment) {
    return {
      ok: false,
      error: {
        code: "COMM_LABEL_ASSIGNMENT_NOT_FOUND",
        message: "Label assignment not found",
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "label.unassigned",
      entityType: "label_assignment",
      entityId: existingAssignment.id as unknown as EntityId,
      correlationId,
      details: {
        labelId: params.labelId,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    },
    async (tx) => {
      await tx
        .delete(commLabelAssignment)
        .where(
          and(
            eq(commLabelAssignment.orgId, orgId),
            eq(commLabelAssignment.id, existingAssignment.id),
          ),
        );

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.LABEL_UNASSIGNED",
        version: "1",
        correlationId,
        payload: {
          assignmentId: existingAssignment.id,
          labelId: params.labelId,
          entityType: params.entityType,
          entityId: params.entityId,
        },
      });
    },
  );

  return { ok: true, data: { id: existingAssignment.id } };
}
