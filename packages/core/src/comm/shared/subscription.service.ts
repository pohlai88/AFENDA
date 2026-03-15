import type { DbClient } from "@afenda/db";
import { commSubscription, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  PrincipalId,
  SubscribeEntityCommand,
  UnsubscribeEntityCommand,
  CommSubscriptionId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit";
import { getSubscriptionByUnique } from "./subscription.queries";

export interface CommSubscriptionPolicyContext {
  principalId?: PrincipalId | null;
}

export type CommSubscriptionServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type CommSubscriptionServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommSubscriptionServiceError };

export async function subscribeEntity(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommSubscriptionPolicyContext,
  correlationId: CorrelationId,
  params: SubscribeEntityCommand,
): Promise<CommSubscriptionServiceResult<{ id: CommSubscriptionId }>> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: {
        code: "IAM_PRINCIPAL_NOT_FOUND",
        message: "Authenticated principal is required",
      },
    };
  }

  const orgId = ctx.activeContext.orgId;
  const principalId = policyCtx.principalId;

  const existing = await getSubscriptionByUnique(
    db,
    orgId,
    principalId,
    params.entityType,
    params.entityId,
  );

  if (existing) {
    return { ok: true, data: { id: existing.id } };
  }

  const created = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "subscription.created",
      entityType: "subscription",
      correlationId,
      details: {
        entityType: params.entityType,
        entityId: params.entityId,
      },
    },
    async (tx) => {
      const [row] = await tx
        .insert(commSubscription)
        .values({
          orgId,
          principalId,
          entityType: params.entityType,
          entityId: params.entityId,
        })
        .returning({ id: commSubscription.id });

      if (!row) throw new Error("Failed to create subscription");

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.SUBSCRIPTION_CREATED",
        version: "1",
        correlationId,
        payload: {
          subscriptionId: row.id,
          principalId,
          entityType: params.entityType,
          entityId: params.entityId,
        },
      });

      return row;
    },
  );

  return { ok: true, data: { id: created.id as CommSubscriptionId } };
}

export async function unsubscribeEntity(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommSubscriptionPolicyContext,
  correlationId: CorrelationId,
  params: UnsubscribeEntityCommand,
): Promise<CommSubscriptionServiceResult<{ id: CommSubscriptionId }>> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: {
        code: "IAM_PRINCIPAL_NOT_FOUND",
        message: "Authenticated principal is required",
      },
    };
  }

  const orgId = ctx.activeContext.orgId;
  const principalId = policyCtx.principalId;

  const existing = await getSubscriptionByUnique(
    db,
    orgId,
    principalId,
    params.entityType,
    params.entityId,
  );

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "COMM_SUBSCRIPTION_NOT_FOUND",
        message: "Subscription not found",
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "subscription.deleted",
      entityType: "subscription",
      entityId: existing.id as unknown as EntityId,
      correlationId,
      details: {
        entityType: params.entityType,
        entityId: params.entityId,
      },
    },
    async (tx) => {
      await tx
        .delete(commSubscription)
        .where(and(eq(commSubscription.orgId, orgId), eq(commSubscription.id, existing.id)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.SUBSCRIPTION_DELETED",
        version: "1",
        correlationId,
        payload: {
          subscriptionId: existing.id,
          principalId,
          entityType: params.entityType,
          entityId: params.entityId,
        },
      });
    },
  );

  return { ok: true, data: { id: existing.id } };
}
