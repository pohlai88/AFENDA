/**
 * Invoice lifecycle service — submit, approve, reject, void.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Emits an outbox event inside the same transaction.
 *   3. Uses `nextNumber()` for gap-free invoice numbers (submit only).
 *   4. Enforces SoD via `canApproveInvoice()` from the policy layer.
 *   5. Validates status transitions — fail-closed on invalid state.
 *
 * RULES:
 *   - No HTTP/Fastify imports — this is a pure domain service.
 *   - DB operations use the `DbClient` from `@afenda/db`.
 *   - Error codes are from `@afenda/contracts` (AP_* prefix).
 *   - Status history rows are append-only — never updated or deleted.
 */

import type { DbClient } from "@afenda/db";
import { invoice, invoiceStatusHistory, outboxEvent, supplier } from "@afenda/db";
import { eq, and, sql } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  InvoiceId,
  SupplierId,
  InvoiceStatus,
  EntityId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../infra/audit.js";
import { nextNumber } from "../../infra/numbering.js";
import { canApproveInvoice, canMarkPaid } from "../sod.js";
import type { PolicyContext } from "../sod.js";

// ── Types ────────────────────────────────────────────────────────────────────

/** Valid status transitions. Key = from, value = allowed to-states. */
const TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ["submitted"],
  submitted: ["approved", "rejected", "voided"],
  approved: ["posted", "voided"],
  posted: ["paid"],
  paid: [],
  rejected: [],
  voided: [],
};

export type InvoiceServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type InvoiceServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: InvoiceServiceError };

// ── Submit ───────────────────────────────────────────────────────────────────

export interface SubmitInvoiceParams {
  supplierId: SupplierId;
  amountMinor: bigint;
  currencyCode: string;
  dueDate?: string | null;
  poReference?: string | null;
  idempotencyKey: string;
}

export async function submitInvoice(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  correlationId: CorrelationId,
  params: SubmitInvoiceParams,
): Promise<InvoiceServiceResult<{ id: InvoiceId; invoiceNumber: string }>> {
  const orgId = ctx.activeContext.orgId;

  // Verify supplier exists and belongs to this org
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
    actorPrincipalId: typeof policyCtx.principalId;
    action: "invoice.submitted";
    entityType: "invoice";
    entityId?: EntityId;
    correlationId: CorrelationId;
    details: Record<string, string>;
  } = {
    actorPrincipalId: policyCtx.principalId,
    action: "invoice.submitted",
    entityType: "invoice",
    correlationId,
    details: {
      supplierId: params.supplierId,
      amountMinor: params.amountMinor.toString(),
      currencyCode: params.currencyCode,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    // Gap-free invoice number inside the same transaction
    const invoiceNumber = await nextNumber(tx, orgId, "invoice");

    const [row] = await tx
      .insert(invoice)
      .values({
        orgId,
        supplierId: params.supplierId,
        invoiceNumber,
        amountMinor: params.amountMinor,
        currencyCode: params.currencyCode,
        status: "submitted",
        dueDate: params.dueDate ?? null,
        poReference: params.poReference ?? null,
        submittedByPrincipalId: policyCtx.principalId ?? null,
        submittedAt: sql`now()`,
      })
      .returning({ id: invoice.id });

    if (!row) throw new Error("Failed to insert invoice");

    // Back-fill entityId now that we have the generated ID
    auditEntry.entityId = row.id as unknown as EntityId;

    // Status history — initial transition
    await tx.insert(invoiceStatusHistory).values({
      invoiceId: row.id,
      orgId,
      fromStatus: null,
      toStatus: "submitted",
      actorPrincipalId: policyCtx.principalId ?? null,
      correlationId,
    });

    // Outbox event
    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.INVOICE_SUBMITTED",
      version: "1",
      correlationId,
      payload: {
        invoiceId: row.id,
        invoiceNumber,
        supplierId: params.supplierId,
        amountMinor: params.amountMinor.toString(),
        currencyCode: params.currencyCode,
      },
    });

    return { id: row.id as InvoiceId, invoiceNumber };
  });

  return { ok: true, data: result };
}

// ── Approve ──────────────────────────────────────────────────────────────────

export async function approveInvoice(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  correlationId: CorrelationId,
  invoiceId: InvoiceId,
  reason?: string,
): Promise<InvoiceServiceResult<{ id: InvoiceId }>> {
  const orgId = ctx.activeContext.orgId;

  // Fetch current invoice
  const [inv] = await db
    .select({
      id: invoice.id,
      status: invoice.status,
      submittedByPrincipalId: invoice.submittedByPrincipalId,
    })
    .from(invoice)
    .where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, orgId)));

  if (!inv) {
    return {
      ok: false,
      error: { code: "AP_INVOICE_NOT_FOUND", message: "Invoice not found" },
    };
  }

  // Status transition guard
  if (!TRANSITIONS[inv.status as InvoiceStatus]?.includes("approved")) {
    const code =
      inv.status === "approved"
        ? "AP_INVOICE_ALREADY_APPROVED"
        : "AP_INVOICE_INVALID_STATUS_TRANSITION";
    return {
      ok: false,
      error: {
        code,
        message: `Cannot approve invoice in status '${inv.status}'`,
        meta: { currentStatus: inv.status },
      },
    };
  }

  // SoD — submitter ≠ approver
  const sodResult = canApproveInvoice(policyCtx, inv.submittedByPrincipalId as PrincipalId | null);
  if (!sodResult.allowed) {
    return {
      ok: false,
      error: {
        code:
          sodResult.code === "MISSING_PERMISSION"
            ? "IAM_INSUFFICIENT_PERMISSIONS"
            : "SHARED_FORBIDDEN",
        message: sodResult.reason,
        meta: sodResult.meta,
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "invoice.approved",
      entityType: "invoice",
      entityId: invoiceId as unknown as EntityId,
      correlationId,
      details: { reason: reason ?? null },
    },
    async (tx) => {
      const [updated] = await tx
        .update(invoice)
        .set({ status: "approved", updatedAt: sql`now()` })
        .where(
          and(eq(invoice.id, invoiceId), eq(invoice.orgId, orgId), eq(invoice.status, inv.status)),
        )
        .returning({ id: invoice.id });

      if (!updated) {
        throw new Error("CONFLICT: invoice status changed concurrently");
      }

      await tx.insert(invoiceStatusHistory).values({
        invoiceId,
        orgId,
        fromStatus: inv.status as InvoiceStatus,
        toStatus: "approved",
        actorPrincipalId: policyCtx.principalId ?? null,
        correlationId,
        reason,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "AP.INVOICE_APPROVED",
        version: "1",
        correlationId,
        payload: { invoiceId, approvedBy: policyCtx.principalId ?? null },
      });
    },
  );

  return { ok: true, data: { id: invoiceId } };
}

// ── Reject ───────────────────────────────────────────────────────────────────

export async function rejectInvoice(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  correlationId: CorrelationId,
  invoiceId: InvoiceId,
  reason: string,
): Promise<InvoiceServiceResult<{ id: InvoiceId }>> {
  const orgId = ctx.activeContext.orgId;

  const [inv] = await db
    .select({ id: invoice.id, status: invoice.status })
    .from(invoice)
    .where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, orgId)));

  if (!inv) {
    return {
      ok: false,
      error: { code: "AP_INVOICE_NOT_FOUND", message: "Invoice not found" },
    };
  }

  if (!TRANSITIONS[inv.status as InvoiceStatus]?.includes("rejected")) {
    return {
      ok: false,
      error: {
        code: "AP_INVOICE_INVALID_STATUS_TRANSITION",
        message: `Cannot reject invoice in status '${inv.status}'`,
        meta: { currentStatus: inv.status },
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "invoice.rejected",
      entityType: "invoice",
      entityId: invoiceId as unknown as EntityId,
      correlationId,
      details: { reason },
    },
    async (tx) => {
      const [updated] = await tx
        .update(invoice)
        .set({ status: "rejected", updatedAt: sql`now()` })
        .where(
          and(eq(invoice.id, invoiceId), eq(invoice.orgId, orgId), eq(invoice.status, inv.status)),
        )
        .returning({ id: invoice.id });

      if (!updated) {
        throw new Error("CONFLICT: invoice status changed concurrently");
      }

      await tx.insert(invoiceStatusHistory).values({
        invoiceId,
        orgId,
        fromStatus: inv.status as InvoiceStatus,
        toStatus: "rejected",
        actorPrincipalId: policyCtx.principalId ?? null,
        correlationId,
        reason,
      });

      // Outbox event
      await tx.insert(outboxEvent).values({
        orgId,
        type: "AP.INVOICE_REJECTED",
        version: "1",
        correlationId,
        payload: { invoiceId, rejectedBy: policyCtx.principalId ?? null, reason },
      });
    },
  );

  return { ok: true, data: { id: invoiceId } };
}

// ── Void ─────────────────────────────────────────────────────────────────────

export async function voidInvoice(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  correlationId: CorrelationId,
  invoiceId: InvoiceId,
  reason: string,
): Promise<InvoiceServiceResult<{ id: InvoiceId }>> {
  const orgId = ctx.activeContext.orgId;

  const [inv] = await db
    .select({ id: invoice.id, status: invoice.status })
    .from(invoice)
    .where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, orgId)));

  if (!inv) {
    return {
      ok: false,
      error: { code: "AP_INVOICE_NOT_FOUND", message: "Invoice not found" },
    };
  }

  if (inv.status === "voided") {
    return {
      ok: false,
      error: { code: "AP_INVOICE_ALREADY_VOIDED", message: "Invoice is already voided" },
    };
  }

  if (!TRANSITIONS[inv.status as InvoiceStatus]?.includes("voided")) {
    return {
      ok: false,
      error: {
        code: "AP_INVOICE_INVALID_STATUS_TRANSITION",
        message: `Cannot void invoice in status '${inv.status}'`,
        meta: { currentStatus: inv.status },
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "invoice.voided",
      entityType: "invoice",
      entityId: invoiceId as unknown as EntityId,
      correlationId,
      details: { reason },
    },
    async (tx) => {
      const [updated] = await tx
        .update(invoice)
        .set({ status: "voided", updatedAt: sql`now()` })
        .where(
          and(eq(invoice.id, invoiceId), eq(invoice.orgId, orgId), eq(invoice.status, inv.status)),
        )
        .returning({ id: invoice.id });

      if (!updated) {
        throw new Error("CONFLICT: invoice status changed concurrently");
      }

      await tx.insert(invoiceStatusHistory).values({
        invoiceId,
        orgId,
        fromStatus: inv.status as InvoiceStatus,
        toStatus: "voided",
        actorPrincipalId: policyCtx.principalId ?? null,
        correlationId,
        reason,
      });

      // Outbox event
      await tx.insert(outboxEvent).values({
        orgId,
        type: "AP.INVOICE_VOIDED",
        version: "1",
        correlationId,
        payload: { invoiceId, voidedBy: policyCtx.principalId ?? null, reason },
      });
    },
  );

  return { ok: true, data: { id: invoiceId } };
}

// ── Mark Paid ────────────────────────────────────────────────────────────────

export interface MarkPaidParams {
  invoiceId: InvoiceId;
  paymentReference: string;
  paidAt?: string;
  reason?: string;
  idempotencyKey: string;
}

export async function markPaid(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  correlationId: CorrelationId,
  params: MarkPaidParams,
): Promise<InvoiceServiceResult<{ id: InvoiceId }>> {
  const orgId = ctx.activeContext.orgId;

  // Permission gate
  const sodResult = canMarkPaid(policyCtx);
  if (!sodResult.allowed) {
    return {
      ok: false,
      error: {
        code:
          sodResult.code === "MISSING_PERMISSION"
            ? "IAM_INSUFFICIENT_PERMISSIONS"
            : "SHARED_FORBIDDEN",
        message: sodResult.reason,
        meta: sodResult.meta,
      },
    };
  }

  const [inv] = await db
    .select({ id: invoice.id, status: invoice.status })
    .from(invoice)
    .where(and(eq(invoice.id, params.invoiceId), eq(invoice.orgId, orgId)));

  if (!inv) {
    return {
      ok: false,
      error: { code: "AP_INVOICE_NOT_FOUND", message: "Invoice not found" },
    };
  }

  if (inv.status === "paid") {
    return {
      ok: false,
      error: { code: "AP_INVOICE_ALREADY_PAID", message: "Invoice is already paid" },
    };
  }

  if (!TRANSITIONS[inv.status as InvoiceStatus]?.includes("paid")) {
    return {
      ok: false,
      error: {
        code: "AP_INVOICE_INVALID_STATUS_TRANSITION",
        message: `Cannot mark invoice as paid in status '${inv.status}'`,
        meta: { currentStatus: inv.status },
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "invoice.paid",
      entityType: "invoice",
      entityId: params.invoiceId as unknown as EntityId,
      correlationId,
      details: {
        paymentReference: params.paymentReference,
        reason: params.reason ?? null,
      },
    },
    async (tx) => {
      const [updated] = await tx
        .update(invoice)
        .set({
          status: "paid",
          paidAt: params.paidAt ? sql`${params.paidAt}::timestamptz` : sql`now()`,
          paidByPrincipalId: policyCtx.principalId ?? null,
          paymentReference: params.paymentReference,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(invoice.id, params.invoiceId),
            eq(invoice.orgId, orgId),
            eq(invoice.status, inv.status),
          ),
        )
        .returning({ id: invoice.id });

      if (!updated) {
        throw new Error("CONFLICT: invoice status changed concurrently");
      }

      await tx.insert(invoiceStatusHistory).values({
        invoiceId: params.invoiceId,
        orgId,
        fromStatus: inv.status as InvoiceStatus,
        toStatus: "paid",
        actorPrincipalId: policyCtx.principalId ?? null,
        correlationId,
        reason: params.reason,
      });

      // Outbox event
      await tx.insert(outboxEvent).values({
        orgId,
        type: "AP.INVOICE_PAID",
        version: "1",
        correlationId,
        payload: {
          invoiceId: params.invoiceId,
          paidBy: policyCtx.principalId ?? null,
          paymentReference: params.paymentReference,
        },
      });
    },
  );

  return { ok: true, data: { id: params.invoiceId } };
}
