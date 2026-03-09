/**
 * Purchase Order service — create, list, get.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Emits an outbox event inside the same transaction.
 *   3. Uses `nextNumber()` for gap-free PO numbers.
 */
import type { DbClient } from "@afenda/db";
import { purchaseOrder, outboxEvent, supplier } from "@afenda/db";
import { eq, and } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  PurchaseOrderId,
  SupplierId,
  EntityId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit.js";
import { nextNumber } from "../../kernel/execution/numbering/numbering.js";
import type { PolicyContext } from "../finance/sod.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type PurchaseOrderServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; meta?: Record<string, string> } };

// ── Create ────────────────────────────────────────────────────────────────────

export async function createPurchaseOrder(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  correlationId: CorrelationId,
  params: {
    supplierId: SupplierId;
    amountMinor: bigint;
    currencyCode: string;
    idempotencyKey: string;
  },
): Promise<PurchaseOrderServiceResult<{ id: PurchaseOrderId; poNumber: string }>> {
  const orgId = ctx.activeContext.orgId;

  const [sup] = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.id, params.supplierId), eq(supplier.orgId, orgId)));

  if (!sup) {
    return {
      ok: false,
      error: {
        code: "SUP_SUPPLIER_NOT_FOUND",
        message: "Supplier not found",
        meta: { supplierId: params.supplierId },
      },
    };
  }

  const auditEntry: {
    actorPrincipalId: PrincipalId | null | undefined;
    action: "purchase-order.created";
    entityType: "purchase_order";
    entityId?: EntityId;
    correlationId: CorrelationId;
    details: Record<string, string>;
  } = {
    actorPrincipalId: policyCtx.principalId,
    action: "purchase-order.created",
    entityType: "purchase_order",
    correlationId,
    details: {
      supplierId: params.supplierId,
      amountMinor: params.amountMinor.toString(),
      currencyCode: params.currencyCode,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const poNumber = await nextNumber(tx, orgId, "purchaseOrder");

    const [row] = await tx
      .insert(purchaseOrder)
      .values({
        orgId,
        supplierId: params.supplierId,
        poNumber,
        amountMinor: params.amountMinor,
        currencyCode: params.currencyCode,
        status: "draft",
      })
      .returning({ id: purchaseOrder.id });

    if (!row) throw new Error("Failed to insert purchase order");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "PURCHASING.PURCHASE_ORDER_CREATED",
      version: "1",
      correlationId,
      payload: {
        purchaseOrderId: row.id,
        poNumber,
        supplierId: params.supplierId,
        amountMinor: params.amountMinor.toString(),
        currencyCode: params.currencyCode,
      },
    });

    return { id: row.id as PurchaseOrderId, poNumber };
  });

  return { ok: true, data: result };
}
