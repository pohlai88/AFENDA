/**
 * Payment Run Item service — add item to payment run.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Emits an outbox event inside the same transaction.
 *
 * RULES:
 *   - No HTTP/Fastify imports — pure domain service.
 *   - Error codes: AP_PAYMENT_RUN_ITEM_* from @afenda/contracts.
 */

import type { DbClient } from "@afenda/db";
import { paymentRunItem, paymentRun, invoice, outboxEvent } from "@afenda/db";
import { eq, and, sql } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  PaymentRunItemId,
  EntityId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type PaymentRunItemServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type PaymentRunItemServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PaymentRunItemServiceError };

export interface AddPaymentRunItemParams {
  paymentRunId: string;
  invoiceId: string;
  amountPaidMinor?: bigint;
  takeDiscount?: boolean;
}

const PAYABLE_STATUSES = ["approved", "posted"] as const;

// ── Add Payment Run Item ─────────────────────────────────────────────────────

export async function addPaymentRunItem(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: AddPaymentRunItemParams,
): Promise<PaymentRunItemServiceResult<{ id: PaymentRunItemId }>> {
  const orgId = ctx.activeContext.orgId;

  // 1. Validate payment run exists and is DRAFT
  const [run] = await db
    .select({
      id: paymentRun.id,
      status: paymentRun.status,
      currencyCode: paymentRun.currencyCode,
      paymentDate: paymentRun.paymentDate,
    })
    .from(paymentRun)
    .where(and(eq(paymentRun.orgId, orgId), eq(paymentRun.id, params.paymentRunId)))
    .limit(1);

  if (!run) {
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_RUN_NOT_FOUND",
        message: "Payment run not found",
        meta: { paymentRunId: params.paymentRunId },
      },
    };
  }

  if (run.status !== "DRAFT") {
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_RUN_NOT_DRAFT",
        message: "Payment run is not in DRAFT status; items cannot be added",
        meta: { paymentRunId: params.paymentRunId, status: run.status },
      },
    };
  }

  // 2. Validate invoice exists, is payable, and currency matches
  const [inv] = await db
    .select({
      id: invoice.id,
      supplierId: invoice.supplierId,
      invoiceNumber: invoice.invoiceNumber,
      amountMinor: invoice.amountMinor,
      currencyCode: invoice.currencyCode,
      status: invoice.status,
      dueDate: invoice.dueDate,
    })
    .from(invoice)
    .where(and(eq(invoice.orgId, orgId), eq(invoice.id, params.invoiceId)))
    .limit(1);

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

  if (inv.status === "paid") {
    return {
      ok: false,
      error: {
        code: "AP_INVOICE_ALREADY_PAID",
        message: "Invoice has already been paid",
        meta: { invoiceId: params.invoiceId },
      },
    };
  }

  if (!(PAYABLE_STATUSES as readonly string[]).includes(inv.status)) {
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_RUN_ITEM_INVOICE_NOT_PAYABLE",
        message: "Invoice is not in a payable status (must be approved or posted)",
        meta: { invoiceId: params.invoiceId, status: inv.status },
      },
    };
  }

  if (inv.currencyCode !== run.currencyCode) {
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_RUN_CURRENCY_MISMATCH",
        message: "Invoice currency does not match payment run currency",
        meta: {
          invoiceCurrency: inv.currencyCode,
          runCurrency: run.currencyCode,
        },
      },
    };
  }

  const amountPaid = params.amountPaidMinor ?? inv.amountMinor;
  if (amountPaid > inv.amountMinor) {
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_RUN_ITEM_AMOUNT_EXCEEDS_BALANCE",
        message: "Amount to pay exceeds invoice amount",
        meta: {
          invoiceId: params.invoiceId,
          invoiceAmount: String(inv.amountMinor),
          amountPaid: String(amountPaid),
        },
      },
    };
  }

  // 3. Check for duplicate (invoice already in this run)
  const [existing] = await db
    .select({ id: paymentRunItem.id })
    .from(paymentRunItem)
    .where(
      and(
        eq(paymentRunItem.orgId, orgId),
        eq(paymentRunItem.paymentRunId, params.paymentRunId),
        eq(paymentRunItem.invoiceId, params.invoiceId),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_RUN_ITEM_DUPLICATE_INVOICE",
        message: "Invoice is already in this payment run",
        meta: { invoiceId: params.invoiceId },
      },
    };
  }

  const discountTaken = BigInt(0); // Early payment discount: future enhancement
  const dueDateStr = inv.dueDate
    ? String(inv.dueDate).slice(0, 10)
    : String(run.paymentDate).slice(0, 10);

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId ?? null,
    action: "payment-run-item.added" as const,
    entityType: "payment_run_item" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      paymentRunId: params.paymentRunId,
      invoiceId: params.invoiceId,
      amountPaidMinor: String(amountPaid),
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(paymentRunItem)
      .values({
        orgId,
        paymentRunId: params.paymentRunId,
        invoiceId: params.invoiceId,
        supplierId: inv.supplierId,
        invoiceNumber: inv.invoiceNumber,
        invoiceDueDate: dueDateStr,
        invoiceAmountMinor: inv.amountMinor,
        amountPaidMinor: amountPaid,
        discountTakenMinor: discountTaken,
        status: "PENDING",
      })
      .returning({ id: paymentRunItem.id });

    if (!row) throw new Error("Failed to insert payment run item");

    auditEntry.entityId = row.id as unknown as EntityId;

    // Update payment run totals
    await tx
      .update(paymentRun)
      .set({
        totalAmountMinor: sql`${paymentRun.totalAmountMinor} + ${amountPaid}`,
        totalDiscountMinor: sql`${paymentRun.totalDiscountMinor} + ${discountTaken}`,
        itemCount: sql`${paymentRun.itemCount} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(paymentRun.id, params.paymentRunId),
          eq(paymentRun.orgId, orgId),
        ),
      );

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.PAYMENT_RUN_ITEM_ADDED",
      version: "1",
      correlationId,
      payload: {
        paymentRunItemId: row.id,
        paymentRunId: params.paymentRunId,
        invoiceId: params.invoiceId,
        amountPaidMinor: String(amountPaid),
      },
    });

    return { id: row.id as PaymentRunItemId };
  });

  return { ok: true, data: result };
}
