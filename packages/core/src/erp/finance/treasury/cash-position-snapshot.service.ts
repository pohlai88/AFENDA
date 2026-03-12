import type { DbClient } from "@afenda/db";
import {
  bankAccount,
  cashPositionSnapshot,
  cashPositionSnapshotLine,
  cashPositionSnapshotLineage,
  liquiditySourceFeed,
  outboxEvent,
} from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CashPositionBucketType,
  CorrelationId,
  CashPositionSourceType,
  EntityId,
  PrincipalId,
  OrgId,
  CashPositionSnapshotId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";
import { computeProjectedAvailable } from "./calculators/cash-position";
import { normalizeToBase } from "./fx-normalization.service";

function sumMinor(values: string[]): string {
  return values.reduce((acc, value) => (BigInt(acc) + BigInt(value)).toString(), "0");
}

interface NormalizedSnapshotFeed {
  id: string;
  sourceType: "ap_due_payment" | "ar_expected_receipt" | "manual_adjustment";
  bankAccountId: string | null;
  originalCurrencyCode: string;
  originalAmountMinor: string;
  normalizedAmountMinor: string;
  dueDate: string;
  direction: "inflow" | "outflow";
  fxRateSnapshotId: string | null;
}

export type CashPositionSnapshotServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type CashPositionSnapshotServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CashPositionSnapshotServiceError };

export interface RequestCashPositionSnapshotParams {
  snapshotDate: string;
  asOfAt: string;
  baseCurrencyCode: string;
  sourceVersion: string;
}

export async function requestCashPositionSnapshot(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: RequestCashPositionSnapshotParams,
): Promise<CashPositionSnapshotServiceResult<{ id: CashPositionSnapshotId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const activeAccounts = await db
    .select({ id: bankAccount.id, currencyCode: bankAccount.currencyCode })
    .from(bankAccount)
    .where(and(eq(bankAccount.orgId, orgId), eq(bankAccount.status, "active")));

  const feeds = await db
    .select({
      id: liquiditySourceFeed.id,
      sourceType: liquiditySourceFeed.sourceType,
      bankAccountId: liquiditySourceFeed.bankAccountId,
      currencyCode: liquiditySourceFeed.currencyCode,
      amountMinor: liquiditySourceFeed.amountMinor,
      dueDate: liquiditySourceFeed.dueDate,
      direction: liquiditySourceFeed.direction,
    })
    .from(liquiditySourceFeed)
    .where(
      and(
        eq(liquiditySourceFeed.orgId, orgId),
        eq(liquiditySourceFeed.status, "open"),
        sql`${liquiditySourceFeed.dueDate} <= ${params.snapshotDate}`,
      ),
    );

  const normalizedFeeds: NormalizedSnapshotFeed[] = [];
  for (const feed of feeds) {
    const normalization = await normalizeToBase(db, {
      orgId,
      rateDate: params.snapshotDate,
      fromCurrencyCode: feed.currencyCode,
      toCurrencyCode: params.baseCurrencyCode,
      amountMinor: feed.amountMinor,
      sourceVersion: params.sourceVersion,
    });

    if (!normalization.ok) {
      return { ok: false, error: normalization.error };
    }

    normalizedFeeds.push({
      id: feed.id,
      sourceType: feed.sourceType,
      bankAccountId: feed.bankAccountId,
      originalCurrencyCode: feed.currencyCode,
      originalAmountMinor: feed.amountMinor,
      normalizedAmountMinor: normalization.data.normalizedMinor,
      dueDate: feed.dueDate,
      direction: feed.direction,
      fxRateSnapshotId: normalization.data.fxRateSnapshotId,
    });
  }

  const totalBookBalanceMinor = "0";
  const totalAvailableBalanceMinor = "0";
  const totalPendingInflowMinor = sumMinor(
    normalizedFeeds.filter((feed) => feed.direction === "inflow").map((feed) => feed.normalizedAmountMinor),
  );
  const totalPendingOutflowMinor = sumMinor(
    normalizedFeeds
      .filter((feed) => feed.direction === "outflow")
      .map((feed) => feed.normalizedAmountMinor),
  );
  const totalProjectedAvailableMinor = computeProjectedAvailable({
    availableBalanceMinor: totalAvailableBalanceMinor,
    pendingInflowMinor: totalPendingInflowMinor,
    pendingOutflowMinor: totalPendingOutflowMinor,
  });
  const feedSourceIds = normalizedFeeds.map((feed) => feed.id);
  const fxNormalizedFeedCount = normalizedFeeds.filter((feed) => feed.fxRateSnapshotId).length;

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.cash-position.snapshot-requested" as const,
    entityType: "cash_position_snapshot" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      snapshotDate: params.snapshotDate,
      asOfAt: params.asOfAt,
      baseCurrencyCode: params.baseCurrencyCode,
      sourceVersion: params.sourceVersion,
      activeAccountCount: String(activeAccounts.length),
      liquidityFeedCount: String(normalizedFeeds.length),
      liquidityFeedSourceIds: feedSourceIds,
      fxNormalizedFeedCount: String(fxNormalizedFeedCount),
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [snapshot] = await tx
      .insert(cashPositionSnapshot)
      .values({
        orgId: orgId as string,
        snapshotDate: params.snapshotDate,
        asOfAt: params.asOfAt,
        baseCurrencyCode: params.baseCurrencyCode,
        status: "calculated",
        sourceVersion: params.sourceVersion,
        totalBookBalanceMinor,
        totalAvailableBalanceMinor,
        totalPendingInflowMinor,
        totalPendingOutflowMinor,
        totalProjectedAvailableMinor,
      })
      .returning({ id: cashPositionSnapshot.id });

    if (!snapshot) throw new Error("Failed to create cash position snapshot");

    auditEntry.entityId = snapshot.id as unknown as EntityId;

    if (activeAccounts.length > 0) {
      await tx.insert(cashPositionSnapshotLine).values(
        activeAccounts.map((account) => ({
          orgId: orgId as string,
          snapshotId: snapshot.id,
          bankAccountId: account.id,
          currencyCode: account.currencyCode,
          nativeCurrencyCode: account.currencyCode,
          bucketType: "available_balance" as const,
          amountMinor: "0",
          nativeAmountMinor: "0",
          normalizedAmountMinor: "0",
          sourceType: "manual_adjustment" as const,
          sourceId: null,
          lineDescription: "Wave 3 baseline placeholder balance",
        })),
      );
    }

    if (normalizedFeeds.length > 0) {
      const feedLines: Array<{
        orgId: string;
        snapshotId: string;
        bankAccountId: string | null;
        currencyCode: string;
        nativeCurrencyCode: string;
        bucketType: CashPositionBucketType;
        amountMinor: string;
        nativeAmountMinor: string;
        normalizedAmountMinor: string;
        sourceType: CashPositionSourceType;
        sourceId: string;
        lineDescription: string;
      }> = normalizedFeeds.map((feed) => ({
        orgId: orgId as string,
        snapshotId: snapshot.id,
        bankAccountId: feed.bankAccountId,
        currencyCode: params.baseCurrencyCode,
        nativeCurrencyCode: feed.originalCurrencyCode,
        bucketType: feed.direction === "inflow" ? "pending_inflow" : "pending_outflow",
        amountMinor: feed.normalizedAmountMinor,
        nativeAmountMinor: feed.originalAmountMinor,
        normalizedAmountMinor: feed.normalizedAmountMinor,
        sourceType:
          feed.sourceType === "ap_due_payment"
            ? "ap_projection"
            : feed.sourceType === "ar_expected_receipt"
              ? "ar_projection"
              : "manual_adjustment",
        sourceId: feed.id,
        lineDescription: `${feed.sourceType}:${feed.dueDate}:${feed.id}:${feed.originalCurrencyCode}`,
      }));

      const insertedFeedLines = await tx
        .insert(cashPositionSnapshotLine)
        .values(feedLines)
        .returning({
          id: cashPositionSnapshotLine.id,
          sourceId: cashPositionSnapshotLine.sourceId,
        });

      if (insertedFeedLines.length > 0) {
        await tx.insert(cashPositionSnapshotLineage).values(
          insertedFeedLines
            .filter((line) => line.sourceId)
            .map((line) => ({
              orgId: orgId as string,
              snapshotId: snapshot.id,
              snapshotLineId: line.id,
              liquiditySourceFeedId: line.sourceId as string,
            })),
        );
      }
    }

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.CASH_POSITION_SNAPSHOT_REQUESTED",
      version: "1",
      correlationId,
      payload: {
        snapshotId: snapshot.id,
        snapshotDate: params.snapshotDate,
        asOfAt: params.asOfAt,
        baseCurrencyCode: params.baseCurrencyCode,
        sourceLineage: {
          liquidityFeedSourceIds: feedSourceIds,
            liquidityFeedCount: normalizedFeeds.length,
            fxNormalizedFeedCount,
        },
      },
    });

    return { id: snapshot.id as CashPositionSnapshotId };
  });

  return { ok: true, data: result };
}

export async function supersedeCashPositionSnapshot(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: { snapshotId: CashPositionSnapshotId },
): Promise<CashPositionSnapshotServiceResult<{ id: CashPositionSnapshotId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select({ id: cashPositionSnapshot.id, status: cashPositionSnapshot.status })
    .from(cashPositionSnapshot)
    .where(and(eq(cashPositionSnapshot.orgId, orgId), eq(cashPositionSnapshot.id, params.snapshotId)));

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "TREAS_CASH_POSITION_SNAPSHOT_NOT_FOUND",
        message: "Cash position snapshot not found",
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "treasury.cash-position.snapshot-superseded" as const,
      entityType: "cash_position_snapshot" as const,
      entityId: params.snapshotId as unknown as EntityId,
      correlationId,
      details: { previousStatus: existing.status },
    },
    async (tx) => {
      await tx
        .update(cashPositionSnapshot)
        .set({ status: "superseded", updatedAt: sql`now()` })
        .where(and(eq(cashPositionSnapshot.orgId, orgId), eq(cashPositionSnapshot.id, params.snapshotId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.CASH_POSITION_SNAPSHOT_SUPERSEDED",
        version: "1",
        correlationId,
        payload: { snapshotId: params.snapshotId },
      });
    },
  );

  return { ok: true, data: { id: params.snapshotId } };
}
