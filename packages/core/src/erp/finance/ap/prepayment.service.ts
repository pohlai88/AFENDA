/**
 * Prepayment service — create prepayment.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Emits an outbox event inside the same transaction.
 *
 * RULES:
 *   - No HTTP/Fastify imports — pure domain service.
 *   - Error codes: AP_PREPAYMENT_* from @afenda/contracts.
 */

import type { DbClient } from "@afenda/db";
import { prepayment, supplier, outboxEvent } from "@afenda/db";
import { eq, and } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  PrepaymentId,
  EntityId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type PrepaymentServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type PrepaymentServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PrepaymentServiceError };

export interface CreatePrepaymentParams {
  supplierId: string;
  prepaymentNumber: string;
  description?: string;
  currencyCode: string;
  amountMinor: bigint;
  paymentDate: string; // YYYY-MM-DD
  paymentReference: string;
}

// ── Create Prepayment ───────────────────────────────────────────────────────

export async function createPrepayment(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CreatePrepaymentParams,
): Promise<PrepaymentServiceResult<{ id: PrepaymentId }>> {
  const orgId = ctx.activeContext.orgId;

  // Validate supplier exists
  const [sup] = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.orgId, orgId), eq(supplier.id, params.supplierId)))
    .limit(1);

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

  // Check prepayment number uniqueness
  const [existing] = await db
    .select({ id: prepayment.id })
    .from(prepayment)
    .where(and(eq(prepayment.orgId, orgId), eq(prepayment.prepaymentNumber, params.prepaymentNumber)))
    .limit(1);

  if (existing) {
    return {
      ok: false,
      error: {
        code: "AP_PREPAYMENT_NUMBER_EXISTS",
        message: `Prepayment number '${params.prepaymentNumber}' already exists`,
        meta: { prepaymentNumber: params.prepaymentNumber },
      },
    };
  }

  const paymentDateStr =
    typeof params.paymentDate === "string"
      ? params.paymentDate.slice(0, 10)
      : String(params.paymentDate).slice(0, 10);

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId ?? null,
    action: "prepayment.created" as const,
    entityType: "prepayment" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      prepaymentNumber: params.prepaymentNumber,
      supplierId: params.supplierId,
      amountMinor: String(params.amountMinor),
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(prepayment)
      .values({
        orgId,
        supplierId: params.supplierId,
        prepaymentNumber: params.prepaymentNumber,
        description: params.description ?? null,
        currencyCode: params.currencyCode,
        originalAmountMinor: params.amountMinor,
        balanceMinor: params.amountMinor,
        paymentDate: paymentDateStr,
        paymentReference: params.paymentReference,
        status: "PENDING",
      })
      .returning({ id: prepayment.id });

    if (!row) throw new Error("Failed to insert prepayment");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.PREPAYMENT_CREATED",
      version: "1",
      correlationId,
      payload: {
        prepaymentId: row.id,
        supplierId: params.supplierId,
        amountMinor: String(params.amountMinor),
      },
    });

    return { id: row.id as PrepaymentId };
  });

  return { ok: true, data: result };
}
