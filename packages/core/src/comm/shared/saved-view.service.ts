import type { DbClient } from "@afenda/db";
import { commSavedView, outboxEvent } from "@afenda/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  PrincipalId,
  SaveViewCommand,
  UpdateSavedViewCommand,
  DeleteSavedViewCommand,
  CommSavedViewId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit";
import { getSavedViewById } from "./saved-view.queries";

export interface CommSavedViewPolicyContext {
  principalId?: PrincipalId | null;
}

export type CommSavedViewServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type CommSavedViewServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommSavedViewServiceError };

async function clearDefaultInScope(
  db: DbClient,
  orgId: string,
  entityType: SaveViewCommand["entityType"] | UpdateSavedViewCommand["viewId"],
  principalId: PrincipalId | null | undefined,
) {
  const scopePredicate = principalId
    ? eq(commSavedView.principalId, principalId)
    : isNull(commSavedView.principalId);

  await db
    .update(commSavedView)
    .set({ isDefault: false, updatedAt: sql`now()` })
    .where(
      and(
        eq(commSavedView.orgId, orgId),
        eq(commSavedView.entityType, entityType as never),
        scopePredicate,
      ),
    );
}

export async function saveView(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommSavedViewPolicyContext,
  correlationId: CorrelationId,
  params: SaveViewCommand,
): Promise<CommSavedViewServiceResult<{ id: CommSavedViewId }>> {
  const orgId = ctx.activeContext.orgId;
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }

  const actorPrincipalId = policyCtx.principalId;
  const scopePrincipalId = params.isOrgShared ? null : actorPrincipalId;

  const created = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId,
      action: "saved_view.created",
      entityType: "saved_view",
      correlationId,
      details: {
        entityType: params.entityType,
        isOrgShared: String(Boolean(params.isOrgShared)),
      },
    },
    async (tx) => {
      if (params.isDefault) {
        await clearDefaultInScope(
          tx as unknown as DbClient,
          orgId,
          params.entityType,
          scopePrincipalId,
        );
      }

      const [row] = await tx
        .insert(commSavedView)
        .values({
          orgId,
          principalId: scopePrincipalId,
          entityType: params.entityType,
          name: params.name,
          filters: params.filters,
          sortBy: params.sortBy,
          columns: params.columns,
          isDefault: params.isDefault ?? false,
        })
        .returning({ id: commSavedView.id });

      if (!row) throw new Error("Failed to save view");

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.SAVED_VIEW_CREATED",
        version: "1",
        correlationId,
        payload: {
          savedViewId: row.id,
          entityType: params.entityType,
          principalId: scopePrincipalId,
        },
      });

      return row;
    },
  );

  return { ok: true, data: { id: created.id as CommSavedViewId } };
}

export async function updateSavedView(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommSavedViewPolicyContext,
  correlationId: CorrelationId,
  params: UpdateSavedViewCommand,
): Promise<CommSavedViewServiceResult<{ id: CommSavedViewId }>> {
  const orgId = ctx.activeContext.orgId;
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }

  const actorPrincipalId = policyCtx.principalId;
  const existing = await getSavedViewById(db, orgId, params.viewId);
  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_SAVED_VIEW_NOT_FOUND", message: "Saved view not found" },
    };
  }

  if (existing.principalId && existing.principalId !== actorPrincipalId) {
    return {
      ok: false,
      error: { code: "IAM_INSUFFICIENT_PERMISSIONS", message: "Cannot modify another user's view" },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId,
      action: "saved_view.created",
      entityType: "saved_view",
      entityId: params.viewId as unknown as EntityId,
      correlationId,
      details: {
        operation: "update",
        savedViewId: params.viewId,
      },
    },
    async (tx) => {
      if (params.isDefault === true) {
        await clearDefaultInScope(
          tx as unknown as DbClient,
          orgId,
          existing.entityType,
          existing.principalId,
        );
      }

      await tx
        .update(commSavedView)
        .set({
          name: params.name,
          filters: params.filters,
          sortBy: params.sortBy,
          columns: params.columns,
          isDefault: params.isDefault,
          updatedAt: sql`now()`,
        })
        .where(and(eq(commSavedView.orgId, orgId), eq(commSavedView.id, params.viewId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.SAVED_VIEW_UPDATED",
        version: "1",
        correlationId,
        payload: {
          savedViewId: params.viewId,
          entityType: existing.entityType,
          principalId: existing.principalId,
        },
      });
    },
  );

  return { ok: true, data: { id: params.viewId } };
}

export async function deleteSavedView(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommSavedViewPolicyContext,
  correlationId: CorrelationId,
  params: DeleteSavedViewCommand,
): Promise<CommSavedViewServiceResult<{ id: CommSavedViewId }>> {
  const orgId = ctx.activeContext.orgId;
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }

  const actorPrincipalId = policyCtx.principalId;
  const existing = await getSavedViewById(db, orgId, params.viewId);
  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_SAVED_VIEW_NOT_FOUND", message: "Saved view not found" },
    };
  }

  if (existing.principalId && existing.principalId !== actorPrincipalId) {
    return {
      ok: false,
      error: { code: "IAM_INSUFFICIENT_PERMISSIONS", message: "Cannot delete another user's view" },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId,
      action: "saved_view.deleted",
      entityType: "saved_view",
      entityId: params.viewId as unknown as EntityId,
      correlationId,
      details: { savedViewId: params.viewId },
    },
    async (tx) => {
      await tx
        .delete(commSavedView)
        .where(and(eq(commSavedView.orgId, orgId), eq(commSavedView.id, params.viewId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.SAVED_VIEW_DELETED",
        version: "1",
        correlationId,
        payload: {
          savedViewId: params.viewId,
          entityType: existing.entityType,
          principalId: existing.principalId,
        },
      });
    },
  );

  return { ok: true, data: { id: params.viewId } };
}
