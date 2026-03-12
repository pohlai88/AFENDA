import type { DbClient } from "@afenda/db";
import { arExpectedReceiptProjection, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  ArExpectedReceiptProjectionId,
  CorrelationId,
  EntityId,
  OrgId,
  PrincipalId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

export type ArExpectedReceiptProjectionServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type ArExpectedReceiptProjectionServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ArExpectedReceiptProjectionServiceError };

export interface UpsertArExpectedReceiptProjectionParams {
  sourceReceivableId: string;
  customerId: string;
  customerName: string;
  dueDate: string;
  expectedReceiptDate: string;
  currencyCode: string;
  grossAmountMinor: string;
  openAmountMinor: string;
  receiptMethod?: "bank_transfer" | "wire" | "ach" | "sepa" | "cash" | "manual" | null;
  status?: "open" | "partially_received" | "fully_received" | "cancelled";
  sourceVersion: string;
}

export async function upsertArExpectedReceiptProjection(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: UpsertArExpectedReceiptProjectionParams,
): Promise<ArExpectedReceiptProjectionServiceResult<{ id: ArExpectedReceiptProjectionId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select({ id: arExpectedReceiptProjection.id })
    .from(arExpectedReceiptProjection)
    .where(
      and(
        eq(arExpectedReceiptProjection.orgId, orgId),
        eq(arExpectedReceiptProjection.sourceReceivableId, params.sourceReceivableId),
        eq(arExpectedReceiptProjection.sourceVersion, params.sourceVersion),
      ),
    );

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.ar-expected-receipt-projection.upserted" as const,
    entityType: "ar_expected_receipt_projection" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      sourceReceivableId: params.sourceReceivableId,
      customerId: params.customerId,
      dueDate: params.dueDate,
      status: params.status ?? "open",
      sourceVersion: params.sourceVersion,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    if (existing) {
      const [updated] = await tx
        .update(arExpectedReceiptProjection)
        .set({
          customerId: params.customerId,
          customerName: params.customerName,
          dueDate: params.dueDate,
          expectedReceiptDate: params.expectedReceiptDate,
          currencyCode: params.currencyCode,
          grossAmountMinor: params.grossAmountMinor,
          openAmountMinor: params.openAmountMinor,
          receiptMethod: params.receiptMethod ?? null,
          status: params.status ?? "open",
          updatedAt: sql`now()`,
        })
        .where(eq(arExpectedReceiptProjection.id, existing.id))
        .returning({ id: arExpectedReceiptProjection.id });

      if (!updated) throw new Error("Failed to update ar expected receipt projection");
      auditEntry.entityId = updated.id as unknown as EntityId;

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.AR_EXPECTED_RECEIPT_PROJECTION_UPSERTED",
        version: "1",
        correlationId,
        payload: { arExpectedReceiptProjectionId: updated.id, mode: "update" },
      });

      return { id: updated.id as ArExpectedReceiptProjectionId };
    }

    const [inserted] = await tx
      .insert(arExpectedReceiptProjection)
      .values({
        orgId: orgId as string,
        sourceReceivableId: params.sourceReceivableId,
        customerId: params.customerId,
        customerName: params.customerName,
        dueDate: params.dueDate,
        expectedReceiptDate: params.expectedReceiptDate,
        currencyCode: params.currencyCode,
        grossAmountMinor: params.grossAmountMinor,
        openAmountMinor: params.openAmountMinor,
        receiptMethod: params.receiptMethod ?? null,
        status: params.status ?? "open",
        sourceVersion: params.sourceVersion,
      })
      .returning({ id: arExpectedReceiptProjection.id });

    if (!inserted) throw new Error("Failed to insert ar expected receipt projection");
    auditEntry.entityId = inserted.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.AR_EXPECTED_RECEIPT_PROJECTION_UPSERTED",
      version: "1",
      correlationId,
      payload: { arExpectedReceiptProjectionId: inserted.id, mode: "insert" },
    });

    return { id: inserted.id as ArExpectedReceiptProjectionId };
  });

  return { ok: true, data: result };
}
