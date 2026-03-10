/**
 * PaymentRun service — create, approve, execute payment run.
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
import { paymentRun, paymentRunItem, invoice, invoiceStatusHistory, outboxEvent } from "@afenda/db";
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

// ── Approve Payment Run ───────────────────────────────────────────────────────

export interface ApprovePaymentRunParams {
  paymentRunId: PaymentRunId;
}

export async function approvePaymentRun(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: ApprovePaymentRunParams,
): Promise<PaymentRunServiceResult<{ id: PaymentRunId }>> {
  const orgId = ctx.activeContext.orgId;

  const [run] = await db
    .select({ id: paymentRun.id, status: paymentRun.status, itemCount: paymentRun.itemCount })
    .from(paymentRun)
    .where(and(eq(paymentRun.id, params.paymentRunId), eq(paymentRun.orgId, orgId)));

  if (!run) {
    return {
      ok: false,
      error: { code: "AP_PAYMENT_RUN_NOT_FOUND", message: "Payment run not found" },
    };
  }

  if (run.status !== "DRAFT") {
    if (run.status === "APPROVED") {
      return {
        ok: false,
        error: { code: "AP_PAYMENT_RUN_ALREADY_APPROVED", message: "Payment run is already approved" },
      };
    }
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_RUN_NOT_DRAFT",
        message: `Cannot approve payment run in status '${run.status}'`,
        meta: { currentStatus: run.status },
      },
    };
  }

  if (run.itemCount === 0) {
    return {
      ok: false,
      error: { code: "AP_PAYMENT_RUN_EMPTY", message: "Payment run has no items" },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId ?? null,
    action: "payment-run.approved" as const,
    entityType: "payment_run" as const,
    entityId: params.paymentRunId as unknown as EntityId,
    correlationId,
    details: { paymentRunId: params.paymentRunId },
  };

  await withAudit(db, ctx, auditEntry, async (tx) => {
    await tx
      .update(paymentRun)
      .set({
        status: "APPROVED",
        approvedByPrincipalId: policyCtx.principalId ?? null,
        approvedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(paymentRun.id, params.paymentRunId), eq(paymentRun.orgId, orgId)));

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.PAYMENT_RUN_APPROVED",
      version: "1",
      correlationId,
      payload: { paymentRunId: params.paymentRunId },
    });
  });

  return { ok: true, data: { id: params.paymentRunId } };
}

// ── Execute Payment Run ──────────────────────────────────────────────────────

export interface ExecutePaymentRunParams {
  paymentRunId: PaymentRunId;
  bankReference?: string;
}

export async function executePaymentRun(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: ExecutePaymentRunParams,
): Promise<PaymentRunServiceResult<{ id: PaymentRunId }>> {
  const orgId = ctx.activeContext.orgId;
  const principalId = policyCtx.principalId ?? null;

  const [run] = await db
    .select({ id: paymentRun.id, status: paymentRun.status })
    .from(paymentRun)
    .where(and(eq(paymentRun.id, params.paymentRunId), eq(paymentRun.orgId, orgId)));

  if (!run) {
    return {
      ok: false,
      error: { code: "AP_PAYMENT_RUN_NOT_FOUND", message: "Payment run not found" },
    };
  }

  if (run.status !== "APPROVED") {
    if (run.status === "EXECUTED") {
      return {
        ok: false,
        error: { code: "AP_PAYMENT_RUN_ALREADY_EXECUTED", message: "Payment run is already executed" },
      };
    }
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_RUN_NOT_DRAFT",
        message: `Cannot execute payment run in status '${run.status}'`,
        meta: { currentStatus: run.status },
      },
    };
  }

  const items = await db
    .select({
      id: paymentRunItem.id,
      invoiceId: paymentRunItem.invoiceId,
      amountPaidMinor: paymentRunItem.amountPaidMinor,
      invoiceNumber: paymentRunItem.invoiceNumber,
    })
    .from(paymentRunItem)
    .where(and(eq(paymentRunItem.paymentRunId, params.paymentRunId), eq(paymentRunItem.orgId, orgId)));

  // Validate all invoices are in "posted" status (required for paid transition)
  for (const item of items) {
    const [inv] = await db
      .select({ status: invoice.status })
      .from(invoice)
      .where(and(eq(invoice.id, item.invoiceId), eq(invoice.orgId, orgId)));
    if (inv && inv.status !== "posted") {
      return {
        ok: false,
        error: {
          code: "AP_INVOICE_INVALID_STATUS_TRANSITION",
          message: `Invoice ${item.invoiceNumber} must be posted before payment. Current status: ${inv.status}`,
          meta: { invoiceId: item.invoiceId },
        },
      };
    }
  }

  const auditEntry = {
    actorPrincipalId: principalId,
    action: "payment-run.executed" as const,
    entityType: "payment_run" as const,
    entityId: params.paymentRunId as unknown as EntityId,
    correlationId,
    details: {
      paymentRunId: params.paymentRunId,
      bankReference: params.bankReference ?? null,
      itemCount: String(items.length),
    },
  };

  await withAudit(db, ctx, auditEntry, async (tx) => {
    // 1. Set status to EXECUTING
    await tx
      .update(paymentRun)
      .set({
        status: "EXECUTING",
        updatedAt: sql`now()`,
      })
      .where(and(eq(paymentRun.id, params.paymentRunId), eq(paymentRun.orgId, orgId)));

    // 2. For each item: mark invoice paid, update item status
    const paymentRef = params.bankReference ?? `PR-${params.paymentRunId.slice(0, 8)}`;
    for (const item of items) {
      await tx
        .update(invoice)
        .set({
          status: "paid",
          paidAt: sql`now()`,
          paidByPrincipalId: principalId,
          paymentReference: paymentRef,
          updatedAt: sql`now()`,
        })
        .where(and(eq(invoice.id, item.invoiceId), eq(invoice.orgId, orgId)));

      await tx.insert(invoiceStatusHistory).values({
        invoiceId: item.invoiceId,
        orgId,
        fromStatus: "posted",
        toStatus: "paid",
        actorPrincipalId: principalId,
        correlationId,
        reason: `Payment run ${params.paymentRunId}`,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "AP.INVOICE_PAID",
        version: "1",
        correlationId,
        payload: {
          invoiceId: item.invoiceId,
          paymentRunId: params.paymentRunId,
          amountPaidMinor: item.amountPaidMinor.toString(),
          paymentReference: paymentRef,
        },
      });

      await tx
        .update(paymentRunItem)
        .set({
          status: "PAID",
          paymentReference: paymentRef,
          updatedAt: sql`now()`,
        })
        .where(eq(paymentRunItem.id, item.id));
    }

    // 3. Set payment run to EXECUTED
    await tx
      .update(paymentRun)
      .set({
        status: "EXECUTED",
        executedByPrincipalId: principalId,
        executedAt: sql`now()`,
        bankReference: params.bankReference ?? null,
        updatedAt: sql`now()`,
      })
      .where(and(eq(paymentRun.id, params.paymentRunId), eq(paymentRun.orgId, orgId)));

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.PAYMENT_RUN_EXECUTED",
      version: "1",
      correlationId,
      payload: {
        paymentRunId: params.paymentRunId,
        bankReference: params.bankReference ?? null,
        itemCount: items.length,
      },
    });
  });

  return { ok: true, data: { id: params.paymentRunId } };
}
