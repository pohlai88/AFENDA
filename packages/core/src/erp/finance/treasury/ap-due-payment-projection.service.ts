import type { DbClient } from "@afenda/db";
import { apDuePaymentProjection, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  ApDuePaymentProjectionId,
  CorrelationId,
  EntityId,
  OrgId,
  PrincipalId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

export type ApDuePaymentProjectionServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type ApDuePaymentProjectionServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApDuePaymentProjectionServiceError };

export interface UpsertApDuePaymentProjectionParams {
  sourcePayableId: string;
  supplierId: string;
  supplierName: string;
  paymentTermCode?: string | null;
  dueDate: string;
  expectedPaymentDate: string;
  currencyCode: string;
  grossAmountMinor: string;
  openAmountMinor: string;
  paymentMethod?: "bank_transfer" | "wire" | "ach" | "sepa" | "manual" | null;
  status?: "open" | "partially_paid" | "fully_paid" | "cancelled";
  sourceVersion: string;
}

export async function upsertApDuePaymentProjection(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: UpsertApDuePaymentProjectionParams,
): Promise<ApDuePaymentProjectionServiceResult<{ id: ApDuePaymentProjectionId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select({ id: apDuePaymentProjection.id })
    .from(apDuePaymentProjection)
    .where(
      and(
        eq(apDuePaymentProjection.orgId, orgId),
        eq(apDuePaymentProjection.sourcePayableId, params.sourcePayableId),
        eq(apDuePaymentProjection.sourceVersion, params.sourceVersion),
      ),
    );

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.ap-due-payment-projection.upserted" as const,
    entityType: "ap_due_payment_projection" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      sourcePayableId: params.sourcePayableId,
      supplierId: params.supplierId,
      dueDate: params.dueDate,
      status: params.status ?? "open",
      sourceVersion: params.sourceVersion,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    if (existing) {
      const [updated] = await tx
        .update(apDuePaymentProjection)
        .set({
          supplierId: params.supplierId,
          supplierName: params.supplierName,
          paymentTermCode: params.paymentTermCode ?? null,
          dueDate: params.dueDate,
          expectedPaymentDate: params.expectedPaymentDate,
          currencyCode: params.currencyCode,
          grossAmountMinor: params.grossAmountMinor,
          openAmountMinor: params.openAmountMinor,
          paymentMethod: params.paymentMethod ?? null,
          status: params.status ?? "open",
          updatedAt: sql`now()`,
        })
        .where(eq(apDuePaymentProjection.id, existing.id))
        .returning({ id: apDuePaymentProjection.id });

      if (!updated) throw new Error("Failed to update ap due payment projection");
      auditEntry.entityId = updated.id as unknown as EntityId;

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.AP_DUE_PAYMENT_PROJECTION_UPSERTED",
        version: "1",
        correlationId,
        payload: { apDuePaymentProjectionId: updated.id, mode: "update" },
      });

      return { id: updated.id as ApDuePaymentProjectionId };
    }

    const [inserted] = await tx
      .insert(apDuePaymentProjection)
      .values({
        orgId: orgId as string,
        sourcePayableId: params.sourcePayableId,
        supplierId: params.supplierId,
        supplierName: params.supplierName,
        paymentTermCode: params.paymentTermCode ?? null,
        dueDate: params.dueDate,
        expectedPaymentDate: params.expectedPaymentDate,
        currencyCode: params.currencyCode,
        grossAmountMinor: params.grossAmountMinor,
        openAmountMinor: params.openAmountMinor,
        paymentMethod: params.paymentMethod ?? null,
        status: params.status ?? "open",
        sourceVersion: params.sourceVersion,
      })
      .returning({ id: apDuePaymentProjection.id });

    if (!inserted) throw new Error("Failed to insert ap due payment projection");
    auditEntry.entityId = inserted.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.AP_DUE_PAYMENT_PROJECTION_UPSERTED",
      version: "1",
      correlationId,
      payload: { apDuePaymentProjectionId: inserted.id, mode: "insert" },
    });

    return { id: inserted.id as ApDuePaymentProjectionId };
  });

  return { ok: true, data: result };
}
