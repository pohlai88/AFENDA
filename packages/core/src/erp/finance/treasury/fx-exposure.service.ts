import type { DbClient } from "@afenda/db";
import { outboxEvent, treasuryFxExposureTable } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type { CorrelationId, EntityId, OrgId, PrincipalId } from "@afenda/contracts";
import { CreateFxExposureCommand, CloseFxExposureCommand } from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

export type FxExposureServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type FxExposureServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: FxExposureServiceError };

/**
 * Create an FX exposure record.
 *
 * Guard: sourceType/sourceId combination must not already exist
 * Guard: baseCurrencyCode != quoteCurrencyCode
 */
export async function createFxExposure(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  cmd: CreateFxExposureCommand,
): Promise<FxExposureServiceResult<{ id: string }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  // Guard: Idempotency by exposureNumber + sourceType + sourceId
  const [existing] = await db
    .select({ id: treasuryFxExposureTable.id })
    .from(treasuryFxExposureTable)
    .where(
      and(
        eq(treasuryFxExposureTable.orgId, orgId),
        eq(treasuryFxExposureTable.exposureNumber, cmd.exposureNumber),
        eq(treasuryFxExposureTable.sourceType, cmd.sourceType),
        eq(treasuryFxExposureTable.sourceId, cmd.sourceId),
      ),
    );

  if (existing) {
    return { ok: true, data: { id: existing.id } };
  }

  // Guard: Currency pair validation
  if (cmd.baseCurrencyCode === cmd.quoteCurrencyCode) {
    return {
      ok: false,
      error: {
        code: "TREAS_FX_EXPOSURE_INVALID_CURRENCY_PAIR",
        message: "Base and quote currencies must be different",
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.fx-exposure.created" as const,
    entityType: "fx_exposure" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      exposureNumber: cmd.exposureNumber,
      sourceType: cmd.sourceType,
      sourceId: cmd.sourceId,
      direction: cmd.direction,
      baseCurrencyCode: cmd.baseCurrencyCode,
      quoteCurrencyCode: cmd.quoteCurrencyCode,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [inserted] = await tx
      .insert(treasuryFxExposureTable)
      .values({
        id: crypto.randomUUID(),
        orgId: orgId as string,
        exposureNumber: cmd.exposureNumber,
        exposureDate: cmd.exposureDate,
        valueDate: cmd.valueDate,
        sourceType: cmd.sourceType,
        sourceId: cmd.sourceId,
        baseCurrencyCode: cmd.baseCurrencyCode,
        quoteCurrencyCode: cmd.quoteCurrencyCode,
        direction: cmd.direction,
        grossAmountMinor: cmd.grossAmountMinor,
        openAmountMinor: cmd.grossAmountMinor,
        hedgedAmountMinor: "0",
        status: "open",
        sourceVersion: cmd.sourceVersion,
        createdAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .returning({ id: treasuryFxExposureTable.id });

    if (!inserted) throw new Error("Failed to create FX exposure");
    auditEntry.entityId = inserted.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.FX_EXPOSURE_CREATED",
      version: "1",
      correlationId,
      payload: {
        fxExposureId: inserted.id,
        exposureNumber: cmd.exposureNumber,
        direction: cmd.direction,
      },
    });

    return { id: inserted.id };
  });

  return { ok: true, data: result };
}

/**
 * Close an FX exposure record.
 * Guard: exposure must exist and be in 'open' status
 */
export async function closeFxExposure(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  cmd: CloseFxExposureCommand,
): Promise<FxExposureServiceResult<{ id: string }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select()
    .from(treasuryFxExposureTable)
    .where(
      and(
        eq(treasuryFxExposureTable.orgId, orgId),
        eq(treasuryFxExposureTable.id, cmd.fxExposureId),
      ),
    );

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "TREAS_FX_EXPOSURE_NOT_FOUND",
        message: "FX exposure not found",
      },
    };
  }

  if (existing.status !== "open") {
    return {
      ok: false,
      error: {
        code: "TREAS_FX_EXPOSURE_CANNOT_CLOSE",
        message: `Cannot close exposure in ${existing.status} status`,
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.fx-exposure.closed" as const,
    entityType: "fx_exposure" as const,
    entityId: cmd.fxExposureId as EntityId,
    correlationId,
    details: {},
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [updated] = await tx
      .update(treasuryFxExposureTable)
      .set({ status: "closed" })
      .where(eq(treasuryFxExposureTable.id, cmd.fxExposureId))
      .returning({ id: treasuryFxExposureTable.id });

    if (!updated) throw new Error("Failed to close FX exposure");

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.FX_EXPOSURE_CLOSED",
      version: "1",
      correlationId,
      payload: {
        fxExposureId: updated.id,
      },
    });

    return { id: updated.id };
  });

  return { ok: true, data: result };
}
