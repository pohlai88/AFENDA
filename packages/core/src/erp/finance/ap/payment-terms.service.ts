/**
 * Payment Terms service — create, update.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Emits an outbox event inside the same transaction.
 *
 * RULES:
 *   - No HTTP/Fastify imports — pure domain service.
 *   - Error codes: AP_PAYMENT_TERMS_* from @afenda/contracts.
 */

import type { DbClient } from "@afenda/db";
import { paymentTerms, outboxEvent } from "@afenda/db";
import { eq, and, sql } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  PaymentTermsId,
  EntityId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

// ── Types ────────────────────────────────────────────────────────────────────

export type PaymentTermsServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type PaymentTermsServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PaymentTermsServiceError };

export interface CreatePaymentTermsParams {
  code: string;
  description: string;
  netDays: number;
  discountPercent?: number | null;
  discountDays?: number | null;
}

export interface UpdatePaymentTermsParams {
  id: PaymentTermsId;
  description?: string;
  netDays?: number;
  discountPercent?: number | null;
  discountDays?: number | null;
  status?: "active" | "inactive";
}

// ── Create Payment Terms ───────────────────────────────────────────────────────

export async function createPaymentTerms(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CreatePaymentTermsParams,
): Promise<PaymentTermsServiceResult<{ id: PaymentTermsId }>> {
  const orgId = ctx.activeContext.orgId;

  // Check code uniqueness
  const [existing] = await db
    .select({ id: paymentTerms.id })
    .from(paymentTerms)
    .where(and(eq(paymentTerms.orgId, orgId), eq(paymentTerms.code, params.code)));

  if (existing) {
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_TERMS_CODE_EXISTS",
        message: `Payment terms with code '${params.code}' already exists`,
        meta: { code: params.code },
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId,
    action: "payment-terms.created" as const,
    entityType: "payment_terms" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: { code: params.code, description: params.description },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(paymentTerms)
      .values({
        orgId,
        code: params.code,
        description: params.description,
        netDays: params.netDays,
        discountPercent: params.discountPercent != null ? String(params.discountPercent) : null,
        discountDays: params.discountDays ?? null,
      })
      .returning({ id: paymentTerms.id });

    if (!row) throw new Error("Failed to insert payment terms");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.PAYMENT_TERMS_CREATED",
      version: "1",
      correlationId,
      payload: {
        paymentTermsId: row.id,
        code: params.code,
      },
    });

    return { id: row.id as PaymentTermsId };
  });

  return { ok: true, data: result };
}

// ── Update Payment Terms ───────────────────────────────────────────────────────

export async function updatePaymentTerms(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: UpdatePaymentTermsParams,
): Promise<PaymentTermsServiceResult<{ id: PaymentTermsId }>> {
  const orgId = ctx.activeContext.orgId;

  const [existing] = await db
    .select({ id: paymentTerms.id })
    .from(paymentTerms)
    .where(and(eq(paymentTerms.orgId, orgId), eq(paymentTerms.id, params.id)));

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_TERMS_NOT_FOUND",
        message: "Payment terms not found",
        meta: { id: params.id },
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId,
    action: "payment-terms.updated" as const,
    entityType: "payment_terms" as const,
    entityId: params.id as unknown as EntityId,
    correlationId,
    details: {} as Record<string, string>,
  };

  const updates: Record<string, unknown> = { updatedAt: sql`now()` };
  if (params.description !== undefined) updates.description = params.description;
  if (params.netDays !== undefined) updates.netDays = params.netDays;
  if (params.discountPercent !== undefined) updates.discountPercent = params.discountPercent != null ? String(params.discountPercent) : null;
  if (params.discountDays !== undefined) updates.discountDays = params.discountDays;
  if (params.status !== undefined) updates.status = params.status;

  await withAudit(db, ctx, auditEntry, async (tx) => {
    await tx
      .update(paymentTerms)
      .set(updates as Record<string, unknown>)
      .where(and(eq(paymentTerms.id, params.id), eq(paymentTerms.orgId, orgId)));

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.PAYMENT_TERMS_UPDATED",
      version: "1",
      correlationId,
      payload: {
        paymentTermsId: params.id,
        ...Object.fromEntries(
          Object.entries(updates)
            .filter(([k]) => k !== "updatedAt")
            .map(([k, v]) => [k, String(v)]),
        ),
      },
    });
  });

  return { ok: true, data: { id: params.id } };
}
