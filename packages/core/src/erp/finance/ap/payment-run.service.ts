/**
 * PaymentRun service — create payment run.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Emits an outbox event inside the same transaction.
 *   3. Uses nextNumber() for gap-free run numbers.
 *
 * RULES:
 *   - No HTTP/Fastify imports — pure domain service.
 *   - Error codes: AP_PAYMENT_RUN_* from @afenda/contracts.
 */

import type { DbClient } from "@afenda/db";
import { paymentRun, outboxEvent } from "@afenda/db";
import { eq, and, sql } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  PaymentRunId,
  EntityId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit.js";
import { nextNumber, ensureSequence } from "../../../kernel/execution/numbering/numbering.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type PaymentRunServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type PaymentRunServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PaymentRunServiceError };

export interface CreatePaymentRunParams {
  description?: string;
  paymentMethod: "ACH" | "WIRE" | "CHECK" | "CARD" | "SEPA" | "SWIFT";
  currencyCode: string;
  paymentDate: string; // YYYY-MM-DD
}

// ── Create Payment Run ───────────────────────────────────────────────────────

export async function createPaymentRun(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CreatePaymentRunParams,
): Promise<PaymentRunServiceResult<{ id: PaymentRunId; runNumber: string }>> {
  const orgId = ctx.activeContext.orgId;

  const auditEntry: {
    actorPrincipalId: PrincipalId | null;
    action: "payment-run.created";
    entityType: "payment_run";
    entityId?: EntityId;
    correlationId: CorrelationId;
    details: Record<string, string>;
  } = {
    actorPrincipalId: _policyCtx.principalId ?? null,
    action: "payment-run.created",
    entityType: "payment_run",
    correlationId,
    details: {
      paymentMethod: params.paymentMethod,
      currencyCode: params.currencyCode,
      paymentDate: params.paymentDate,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    // Ensure sequence exists for payment runs (idempotent)
    await ensureSequence(tx, {
      orgId,
      entityType: "paymentRun",
      periodKey: String(new Date().getFullYear()), // gate:allow-js-date
      prefix: "PR",
      padWidth: 4,
    });

    const runNumber = await nextNumber(tx, orgId, "paymentRun");

    const [row] = await tx
      .insert(paymentRun)
      .values({
        orgId,
        runNumber,
        description: params.description ?? null,
        paymentMethod: params.paymentMethod,
        currencyCode: params.currencyCode,
        paymentDate: params.paymentDate,
        status: "DRAFT",
      })
      .returning({ id: paymentRun.id });

    if (!row) throw new Error("Failed to insert payment run");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.PAYMENT_RUN_CREATED",
      version: "1",
      correlationId,
      payload: {
        paymentRunId: row.id,
        runNumber,
        paymentMethod: params.paymentMethod,
        currencyCode: params.currencyCode,
        paymentDate: params.paymentDate,
      },
    });

    return { id: row.id as PaymentRunId, runNumber };
  });

  return { ok: true, data: result };
}
