import type { DbClient } from "@afenda/db";
import { revaluationEvent, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import type { CorrelationId, EntityId, OrgId, PrincipalId } from "@afenda/contracts";
import {
  CreateRevaluationEventCommand,
  UpdateRevaluationEventStatusCommand,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

export type RevaluationEventServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type RevaluationEventServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RevaluationEventServiceError };

/**
 * Create a revaluation event record.
 *
 * Guard: fxExposureId + valuationDate must not already exist
 */
export async function createRevaluationEvent(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  cmd: CreateRevaluationEventCommand,
): Promise<RevaluationEventServiceResult<{ id: string }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  // Guard: Idempotency by exposureId + valuationDate
  const [existing] = await db
    .select({ id: revaluationEvent.id })
    .from(revaluationEvent)
    .where(
      and(
        eq(revaluationEvent.orgId, orgId),
        eq(revaluationEvent.fxExposureId, cmd.fxExposureId),
        eq(revaluationEvent.valuationDate, cmd.valuationDate),
      ),
    );

  if (existing) {
    return { ok: true, data: { id: existing.id } };
  }

  // Guard: Validate delta calculation
  const carries = BigInt(cmd.carryingAmountMinor);
  const revalued = BigInt(cmd.revaluedAmountMinor);
  const delta = BigInt(cmd.revaluationDeltaMinor);
  const expectedDelta = revalued - carries;

  if (delta !== expectedDelta) {
    return {
      ok: false,
      error: {
        code: "TREAS_REVALUATION_INVALID_DELTA",
        message: `Revaluation delta does not match calculation: expected ${expectedDelta.toString()}, got ${delta.toString()}`,
        meta: {
          carrying: cmd.carryingAmountMinor,
          revalued: cmd.revaluedAmountMinor,
          delta: cmd.revaluationDeltaMinor,
          expected: expectedDelta.toString(),
        },
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.revaluation-event.created" as const,
    entityType: "revaluation_event" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      fxExposureId: cmd.fxExposureId,
      valuationDate: cmd.valuationDate,
      revaluationDeltaMinor: cmd.revaluationDeltaMinor,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [inserted] = await tx
      .insert(revaluationEvent)
      .values({
        id: crypto.randomUUID(),
        orgId: orgId as string,
        fxExposureId: cmd.fxExposureId,
        hedgeDesignationId: cmd.hedgeDesignationId || null,
        valuationDate: cmd.valuationDate,
        priorRateSnapshotId: cmd.priorRateSnapshotId || null,
        currentRateSnapshotId: cmd.currentRateSnapshotId,
        carryingAmountMinor: cmd.carryingAmountMinor,
        revaluedAmountMinor: cmd.revaluedAmountMinor,
        revaluationDeltaMinor: cmd.revaluationDeltaMinor,
        status: "pending",
      })
      .returning({ id: revaluationEvent.id });

    if (!inserted) throw new Error("Failed to create revaluation event");
    auditEntry.entityId = inserted.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.REVALUATION_EVENT_CREATED",
      version: "1",
      correlationId,
      payload: {
        revaluationEventId: inserted.id,
        fxExposureId: cmd.fxExposureId,
        valuationDate: cmd.valuationDate,
        delta: cmd.revaluationDeltaMinor,
      },
    });

    return { id: inserted.id };
  });

  return { ok: true, data: result };
}

/**
 * Update revaluation event status.
 * Guards: event must exist, status transition must be valid
 */
export async function updateRevaluationEventStatus(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  cmd: UpdateRevaluationEventStatusCommand,
): Promise<RevaluationEventServiceResult<{ id: string }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select()
    .from(revaluationEvent)
    .where(and(eq(revaluationEvent.orgId, orgId), eq(revaluationEvent.id, cmd.revaluationEventId)));

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "TREAS_REVALUATION_EVENT_NOT_FOUND",
        message: "Revaluation event not found",
      },
    };
  }

  // Guard: Validate status transition
  const validTransitions: Record<string, string[]> = {
    pending: ["calculated", "failed"],
    calculated: ["posted", "failed"],
    posted: [],
    failed: ["pending"],
  };

  if (!validTransitions[existing.status]?.includes(cmd.status)) {
    return {
      ok: false,
      error: {
        code: "TREAS_REVALUATION_INVALID_STATUS_TRANSITION",
        message: `Cannot transition from ${existing.status} to ${cmd.status}`,
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.revaluation-event.status-updated" as const,
    entityType: "revaluation_event" as const,
    entityId: cmd.revaluationEventId as EntityId,
    correlationId,
    details: {
      previousStatus: existing.status,
      newStatus: cmd.status,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [updated] = await tx
      .update(revaluationEvent)
      .set({ status: cmd.status })
      .where(eq(revaluationEvent.id, cmd.revaluationEventId))
      .returning({ id: revaluationEvent.id });

    if (!updated) throw new Error("Failed to update revaluation event");

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.REVALUATION_EVENT_STATUS_UPDATED",
      version: "1",
      correlationId,
      payload: {
        revaluationEventId: updated.id,
        newStatus: cmd.status,
      },
    });

    return { id: updated.id };
  });

  return { ok: true, data: result };
}
