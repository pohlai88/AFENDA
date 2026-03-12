import type { DbClient } from "@afenda/db";
import { outboxEvent, treasuryHedgeDesignationTable } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type { CorrelationId, EntityId, OrgId, PrincipalId } from "@afenda/contracts";
import { DesignateHedgeCommand, DeDesignateHedgeCommand } from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

export type HedgeDesignationServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type HedgeDesignationServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: HedgeDesignationServiceError };

/**
 * Create a hedge designation record.
 *
 * Guard: fxExposureId must not already be hedged
 */
export async function createHedgeDesignation(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  cmd: DesignateHedgeCommand,
): Promise<HedgeDesignationServiceResult<{ id: string }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  // Guard: Check if exposure already hedged
  const [existing] = await db
    .select({ id: treasuryHedgeDesignationTable.id })
    .from(treasuryHedgeDesignationTable)
    .where(
      and(
        eq(treasuryHedgeDesignationTable.orgId, orgId),
        eq(treasuryHedgeDesignationTable.fxExposureId, cmd.fxExposureId),
        eq(treasuryHedgeDesignationTable.status, "designated"),
      ),
    );

  if (existing) {
    return {
      ok: false,
      error: {
        code: "TREAS_HEDGE_ALREADY_ACTIVE",
        message: "Exposure already has designated hedge",
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.hedge-designation.created" as const,
    entityType: "hedge_designation" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      fxExposureId: cmd.fxExposureId,
      hedgeInstrumentType: cmd.hedgeInstrumentType,
      hedgeRelationshipType: cmd.hedgeRelationshipType,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [inserted] = await tx
      .insert(treasuryHedgeDesignationTable)
      .values({
        id: crypto.randomUUID(),
        orgId: orgId as string,
        hedgeNumber: cmd.hedgeNumber,
        fxExposureId: cmd.fxExposureId,
        hedgeInstrumentType: cmd.hedgeInstrumentType,
        hedgeRelationshipType: cmd.hedgeRelationshipType,
        designatedAmountMinor: cmd.designatedAmountMinor,
        startDate: cmd.startDate,
        endDate: cmd.endDate ?? null,
        status: "designated",
        designationMemo: cmd.designationMemo ?? null,
        createdAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .returning({ id: treasuryHedgeDesignationTable.id });

    if (!inserted) throw new Error("Failed to create hedge designation");
    auditEntry.entityId = inserted.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.HEDGE_DESIGNATION_CREATED",
      version: "1",
      correlationId,
      payload: {
        hedgeDesignationId: inserted.id,
        fxExposureId: cmd.fxExposureId,
        hedgeInstrumentType: cmd.hedgeInstrumentType,
      },
    });

    return { id: inserted.id };
  });

  return { ok: true, data: result };
}

/**
 * Update hedge designation status.
 * Guards: designation must exist, status transition must be valid
 */
export async function updateHedgeDesignationStatus(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  cmd: DeDesignateHedgeCommand,
): Promise<HedgeDesignationServiceResult<{ id: string }>> {
  const orgId = ctx.activeContext.orgId as OrgId;
  const targetStatus = "de-designated" as const;

  const [existing] = await db
    .select()
    .from(treasuryHedgeDesignationTable)
    .where(
      and(
        eq(treasuryHedgeDesignationTable.orgId, orgId),
        eq(treasuryHedgeDesignationTable.id, cmd.hedgeDesignationId),
      ),
    );

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "TREAS_HEDGE_DESIGNATION_NOT_FOUND",
        message: "Hedge designation not found",
      },
    };
  }

  // Guard: Validate status transition
  const validTransitions: Record<string, string[]> = {
    draft: ["designated", "de-designated"],
    designated: ["de-designated", "expired"],
    "de-designated": [],
    expired: [],
  };

  if (!validTransitions[existing.status]?.includes(targetStatus)) {
    return {
      ok: false,
      error: {
        code: "TREAS_HEDGE_INVALID_STATUS_TRANSITION",
        message: `Cannot transition from ${existing.status} to ${targetStatus}`,
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.hedge-designation.status-updated" as const,
    entityType: "hedge_designation" as const,
    entityId: cmd.hedgeDesignationId as EntityId,
    correlationId,
    details: {
      previousStatus: existing.status,
      newStatus: targetStatus,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [updated] = await tx
      .update(treasuryHedgeDesignationTable)
      .set({ status: targetStatus })
      .where(eq(treasuryHedgeDesignationTable.id, cmd.hedgeDesignationId))
      .returning({ id: treasuryHedgeDesignationTable.id });

    if (!updated) throw new Error("Failed to update hedge designation");

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.HEDGE_DESIGNATION_STATUS_UPDATED",
      version: "1",
      correlationId,
      payload: {
        hedgeDesignationId: updated.id,
        newStatus: targetStatus,
      },
    });

    return { id: updated.id };
  });

  return { ok: true, data: result };
}
