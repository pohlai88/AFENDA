/**
 * Receipt (GRN) service — create, list, get.
 */
import type { DbClient } from "@afenda/db";
import { receipt, outboxEvent, purchaseOrder } from "@afenda/db";
import { eq, and } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  ReceiptId,
  PurchaseOrderId,
  EntityId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit.js";
import { nextNumber } from "../../kernel/execution/numbering/numbering.js";
import type { PolicyContext } from "../finance/sod.js";

export type ReceiptServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; meta?: Record<string, string> } };

export async function createReceipt(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  correlationId: CorrelationId,
  params: {
    purchaseOrderId: PurchaseOrderId;
    amountMinor: bigint;
    currencyCode: string;
    idempotencyKey: string;
  },
): Promise<ReceiptServiceResult<{ id: ReceiptId; receiptNumber: string }>> {
  const orgId = ctx.activeContext.orgId;

  const [po] = await db
    .select({ id: purchaseOrder.id })
    .from(purchaseOrder)
    .where(
      and(
        eq(purchaseOrder.id, params.purchaseOrderId),
        eq(purchaseOrder.orgId, orgId),
      ),
    );

  if (!po) {
    return {
      ok: false,
      error: {
        code: "PURCH_RECEIPT_PO_NOT_FOUND",
        message: "Purchase order not found",
        meta: { purchaseOrderId: params.purchaseOrderId },
      },
    };
  }

  const auditEntry: {
    actorPrincipalId: PrincipalId | null | undefined;
    action: "receipt.created";
    entityType: "receipt";
    entityId?: EntityId;
    correlationId: CorrelationId;
    details: Record<string, string>;
  } = {
    actorPrincipalId: policyCtx.principalId,
    action: "receipt.created",
    entityType: "receipt",
    correlationId,
    details: {
      purchaseOrderId: params.purchaseOrderId,
      amountMinor: params.amountMinor.toString(),
      currencyCode: params.currencyCode,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const receiptNumber = await nextNumber(tx, orgId, "receipt");

    const [row] = await tx
      .insert(receipt)
      .values({
        orgId,
        purchaseOrderId: params.purchaseOrderId,
        receiptNumber,
        amountMinor: params.amountMinor,
        currencyCode: params.currencyCode,
        status: "draft",
      })
      .returning({ id: receipt.id });

    if (!row) throw new Error("Failed to insert receipt");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "PURCHASING.RECEIPT_CREATED",
      version: "1",
      correlationId,
      payload: {
        receiptId: row.id,
        receiptNumber,
        purchaseOrderId: params.purchaseOrderId,
        amountMinor: params.amountMinor.toString(),
        currencyCode: params.currencyCode,
      },
    });

    return { id: row.id as ReceiptId, receiptNumber };
  });

  return { ok: true, data: result };
}
