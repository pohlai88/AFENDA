/**
 * AP Hold service — create hold, release hold.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Emits an outbox event inside the same transaction.
 *   3. Holds block invoice approval until released.
 *
 * RULES:
 *   - No HTTP/Fastify imports — pure domain service.
 *   - Error codes: AP_HOLD_* from @afenda/contracts.
 *   - Audit actions: hold.created, hold.released.
 */

import type { DbClient } from "@afenda/db";
import { apHold, invoice, outboxEvent } from "@afenda/db";
import { eq, and, sql } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  InvoiceId,
  HoldId,
  EntityId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

// ── Types ────────────────────────────────────────────────────────────────────

export type HoldServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type HoldServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: HoldServiceError };

export interface CreateHoldParams {
  invoiceId: InvoiceId;
  holdType: "DUPLICATE" | "PRICE_VARIANCE" | "QUANTITY_VARIANCE" | "TAX_VARIANCE" | "NEEDS_RECEIPT" | "MANUAL";
  holdReason: string;
}

export interface ReleaseHoldParams {
  holdId: HoldId;
  releaseReason: string;
}

// ── Create Hold ───────────────────────────────────────────────────────────────

export async function createHold(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CreateHoldParams,
): Promise<HoldServiceResult<{ id: HoldId }>> {
  const orgId = ctx.activeContext.orgId;

  // Verify invoice exists and belongs to this org
  const [inv] = await db
    .select({ id: invoice.id })
    .from(invoice)
    .where(and(eq(invoice.id, params.invoiceId), eq(invoice.orgId, orgId)));

  if (!inv) {
    return {
      ok: false,
      error: {
        code: "AP_INVOICE_NOT_FOUND",
        message: "Invoice not found",
        meta: { invoiceId: params.invoiceId },
      },
    };
  }

  const auditEntry: {
    actorPrincipalId: PrincipalId | null;
    action: "hold.created";
    entityType: "hold";
    entityId?: EntityId;
    correlationId: CorrelationId;
    details: Record<string, string>;
  } = {
    actorPrincipalId: policyCtx.principalId ?? null,
    action: "hold.created",
    entityType: "hold",
    correlationId,
    details: {
      invoiceId: params.invoiceId,
      holdType: params.holdType,
      holdReason: params.holdReason,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(apHold)
      .values({
        orgId,
        invoiceId: params.invoiceId,
        holdType: params.holdType,
        holdReason: params.holdReason,
        status: "active",
        createdByPrincipalId: policyCtx.principalId ?? null,
      })
      .returning({ id: apHold.id });

    if (!row) throw new Error("Failed to insert hold");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.HOLD_CREATED",
      version: "1",
      correlationId,
      payload: {
        holdId: row.id,
        invoiceId: params.invoiceId,
        holdType: params.holdType,
        holdReason: params.holdReason,
      },
    });

    return { id: row.id as HoldId };
  });

  return { ok: true, data: result };
}

// ── Release Hold ─────────────────────────────────────────────────────────────

export async function releaseHold(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: ReleaseHoldParams,
): Promise<HoldServiceResult<{ id: HoldId }>> {
  const orgId = ctx.activeContext.orgId;

  const [hold] = await db
    .select({ id: apHold.id, status: apHold.status, invoiceId: apHold.invoiceId })
    .from(apHold)
    .where(and(eq(apHold.orgId, orgId), eq(apHold.id, params.holdId)));

  if (!hold) {
    return {
      ok: false,
      error: {
        code: "AP_HOLD_NOT_FOUND",
        message: "Hold not found",
        meta: { holdId: params.holdId },
      },
    };
  }

  if (hold.status === "released") {
    return {
      ok: false,
      error: {
        code: "AP_HOLD_ALREADY_RELEASED",
        message: "Hold is already released",
        meta: { holdId: params.holdId },
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "hold.released" as const,
    entityType: "hold" as const,
    entityId: params.holdId as unknown as EntityId,
    correlationId,
    details: {
      holdId: params.holdId,
      invoiceId: hold.invoiceId,
      releaseReason: params.releaseReason,
    },
  };

  await withAudit(db, ctx, auditEntry, async (tx) => {
    const [updated] = await tx
      .update(apHold)
      .set({
        status: "released",
        releasedAt: sql`now()`,
        releasedByPrincipalId: policyCtx.principalId ?? null,
        releaseReason: params.releaseReason,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(apHold.id, params.holdId),
          eq(apHold.orgId, orgId),
          eq(apHold.status, "active"),
        ),
      )
      .returning({ id: apHold.id });

    if (!updated) {
      throw new Error("CONFLICT: hold status changed concurrently");
    }

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.HOLD_RELEASED",
      version: "1",
      correlationId,
      payload: {
        holdId: params.holdId,
        invoiceId: hold.invoiceId,
        releaseReason: params.releaseReason,
        releasedBy: policyCtx.principalId ?? null,
      },
    });
  });

  return { ok: true, data: { id: params.holdId } };
}
