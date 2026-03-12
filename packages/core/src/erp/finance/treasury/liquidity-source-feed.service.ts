import type { DbClient } from "@afenda/db";
import { liquiditySourceFeed, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  LiquiditySourceFeedId,
  OrgId,
  PrincipalId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

export type LiquiditySourceFeedServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type LiquiditySourceFeedServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: LiquiditySourceFeedServiceError };

export interface UpsertLiquiditySourceFeedParams {
  sourceType: "ap_due_payment" | "ar_expected_receipt" | "manual_adjustment";
  sourceId: string;
  sourceDocumentNumber?: string | null;
  bankAccountId?: string | null;
  currencyCode: string;
  amountMinor: string;
  dueDate: string;
  direction: "inflow" | "outflow";
  confidenceScore?: number | null;
  status?: "open" | "consumed" | "cancelled";
}

export async function upsertLiquiditySourceFeed(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: UpsertLiquiditySourceFeedParams,
): Promise<LiquiditySourceFeedServiceResult<{ id: LiquiditySourceFeedId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select({ id: liquiditySourceFeed.id })
    .from(liquiditySourceFeed)
    .where(
      and(
        eq(liquiditySourceFeed.orgId, orgId),
        eq(liquiditySourceFeed.sourceType, params.sourceType),
        eq(liquiditySourceFeed.sourceId, params.sourceId),
      ),
    );

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.liquidity-source-feed.upserted" as const,
    entityType: "liquidity_source_feed" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      dueDate: params.dueDate,
      direction: params.direction,
      status: params.status ?? "open",
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    if (existing) {
      const [updated] = await tx
        .update(liquiditySourceFeed)
        .set({
          sourceDocumentNumber: params.sourceDocumentNumber ?? null,
          bankAccountId: params.bankAccountId ?? null,
          currencyCode: params.currencyCode,
          amountMinor: params.amountMinor,
          dueDate: params.dueDate,
          direction: params.direction,
          confidenceScore: params.confidenceScore ?? null,
          status: params.status ?? "open",
          updatedAt: sql`now()`,
        })
        .where(eq(liquiditySourceFeed.id, existing.id))
        .returning({ id: liquiditySourceFeed.id });

      if (!updated) throw new Error("Failed to update liquidity source feed");
      auditEntry.entityId = updated.id as unknown as EntityId;

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.LIQUIDITY_SOURCE_FEED_UPSERTED",
        version: "1",
        correlationId,
        payload: { liquiditySourceFeedId: updated.id, mode: "update" },
      });

      return { id: updated.id as LiquiditySourceFeedId };
    }

    const [inserted] = await tx
      .insert(liquiditySourceFeed)
      .values({
        orgId: orgId as string,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        sourceDocumentNumber: params.sourceDocumentNumber ?? null,
        bankAccountId: params.bankAccountId ?? null,
        currencyCode: params.currencyCode,
        amountMinor: params.amountMinor,
        dueDate: params.dueDate,
        direction: params.direction,
        confidenceScore: params.confidenceScore ?? null,
        status: params.status ?? "open",
      })
      .returning({ id: liquiditySourceFeed.id });

    if (!inserted) throw new Error("Failed to insert liquidity source feed");
    auditEntry.entityId = inserted.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.LIQUIDITY_SOURCE_FEED_UPSERTED",
      version: "1",
      correlationId,
      payload: { liquiditySourceFeedId: inserted.id, mode: "insert" },
    });

    return { id: inserted.id as LiquiditySourceFeedId };
  });

  return { ok: true, data: result };
}
