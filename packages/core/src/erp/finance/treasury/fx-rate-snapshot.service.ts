import type { DbClient } from "@afenda/db";
import { fxRateSnapshot, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  FxRateSnapshotId,
  OrgId,
  PrincipalId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

export type FxRateSnapshotServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type FxRateSnapshotServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: FxRateSnapshotServiceError };

export interface UpsertFxRateSnapshotParams {
  rateDate: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rateScaled: string;
  scale: number;
  providerCode: string;
  sourceVersion: string;
}

export async function upsertFxRateSnapshot(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: UpsertFxRateSnapshotParams,
): Promise<FxRateSnapshotServiceResult<{ id: FxRateSnapshotId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select({ id: fxRateSnapshot.id })
    .from(fxRateSnapshot)
    .where(
      and(
        eq(fxRateSnapshot.orgId, orgId),
        eq(fxRateSnapshot.rateDate, params.rateDate),
        eq(fxRateSnapshot.fromCurrencyCode, params.fromCurrencyCode),
        eq(fxRateSnapshot.toCurrencyCode, params.toCurrencyCode),
        eq(fxRateSnapshot.sourceVersion, params.sourceVersion),
      ),
    );

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.fx-rate-snapshot.upserted" as const,
    entityType: "fx_rate_snapshot" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      rateDate: params.rateDate,
      fromCurrencyCode: params.fromCurrencyCode,
      toCurrencyCode: params.toCurrencyCode,
      sourceVersion: params.sourceVersion,
      providerCode: params.providerCode,
    },
  };

  const result: { id: FxRateSnapshotId } = await withAudit(db, ctx, auditEntry, async (tx) => {
    if (existing) {
      const [updated] = await tx
        .update(fxRateSnapshot)
        .set({
          rateScaled: params.rateScaled,
          scale: params.scale,
          providerCode: params.providerCode,
        })
        .where(eq(fxRateSnapshot.id, existing.id))
        .returning({ id: fxRateSnapshot.id });

      if (!updated) throw new Error("Failed to update FX rate snapshot");
      auditEntry.entityId = updated.id as unknown as EntityId;

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.FX_RATE_SNAPSHOT_UPSERTED",
        version: "1",
        correlationId,
        payload: {
          fxRateSnapshotId: updated.id,
          mode: "update",
        },
      });

      return { id: updated.id as FxRateSnapshotId };
    }

    const [inserted] = await tx
      .insert(fxRateSnapshot)
      .values({
        orgId: orgId as string,
        rateDate: params.rateDate,
        fromCurrencyCode: params.fromCurrencyCode,
        toCurrencyCode: params.toCurrencyCode,
        rateScaled: params.rateScaled,
        scale: params.scale,
        providerCode: params.providerCode,
        sourceVersion: params.sourceVersion,
      })
      .returning({ id: fxRateSnapshot.id });

    if (!inserted) throw new Error("Failed to insert FX rate snapshot");
    auditEntry.entityId = inserted.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.FX_RATE_SNAPSHOT_UPSERTED",
      version: "1",
      correlationId,
      payload: {
        fxRateSnapshotId: inserted.id,
        mode: "insert",
      },
    });

    return { id: inserted.id as FxRateSnapshotId };
  });

  return { ok: true, data: result };
}
