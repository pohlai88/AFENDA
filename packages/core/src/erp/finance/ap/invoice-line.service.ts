/**
 * Invoice Line service — create, update, delete.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Emits an outbox event inside the same transaction.
 *
 * RULES:
 *   - No HTTP/Fastify imports — pure domain service.
 *   - Error codes: AP_INVOICE_LINE_* from @afenda/contracts.
 */

import type { DbClient } from "@afenda/db";
import { invoiceLine, invoice, outboxEvent } from "@afenda/db";
import { eq, and, sql } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  InvoiceLineId,
  EntityId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

// ── Types ────────────────────────────────────────────────────────────────────

export type InvoiceLineServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type InvoiceLineServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: InvoiceLineServiceError };

export interface CreateInvoiceLineParams {
  invoiceId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPriceMinor: bigint;
  glAccountId?: string | null;
  taxCode?: string | null;
}

export interface UpdateInvoiceLineParams {
  id: InvoiceLineId;
  description?: string;
  quantity?: number;
  unitPriceMinor?: bigint;
  glAccountId?: string | null;
  taxCode?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureInvoiceDraft(
  db: DbClient,
  orgId: OrgId,
  invoiceId: string,
): Promise<{ ok: false; error: InvoiceLineServiceError } | { ok: true }> {
  const [inv] = await db
    .select({ id: invoice.id, status: invoice.status })
    .from(invoice)
    .where(and(eq(invoice.orgId, orgId), eq(invoice.id, invoiceId)))
    .limit(1);

  if (!inv) {
    return {
      ok: false,
      error: {
        code: "AP_INVOICE_NOT_FOUND",
        message: "Invoice not found",
        meta: { invoiceId },
      },
    };
  }

  if (inv.status !== "draft") {
    return {
      ok: false,
      error: {
        code: "AP_INVOICE_INVALID_STATUS_TRANSITION",
        message: "Invoice must be in draft status to modify lines",
        meta: { invoiceId, status: inv.status },
      },
    };
  }

  return { ok: true };
}

// ── Create Invoice Line ───────────────────────────────────────────────────────

export async function createInvoiceLine(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CreateInvoiceLineParams,
): Promise<InvoiceLineServiceResult<{ id: InvoiceLineId }>> {
  const orgId = ctx.activeContext.orgId;

  const draftCheck = await ensureInvoiceDraft(db, orgId, params.invoiceId);
  if (!draftCheck.ok) return draftCheck;

  // Check line number uniqueness
  const [existing] = await db
    .select({ id: invoiceLine.id })
    .from(invoiceLine)
    .where(
      and(
        eq(invoiceLine.orgId, orgId),
        eq(invoiceLine.invoiceId, params.invoiceId),
        eq(invoiceLine.lineNumber, params.lineNumber),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      ok: false,
      error: {
        code: "AP_INVOICE_LINE_DUPLICATE_NUMBER",
        message: `Line number ${params.lineNumber} already exists on this invoice`,
        meta: { invoiceId: params.invoiceId, lineNumber: String(params.lineNumber) },
      },
    };
  }

  const amountMinor = BigInt(params.quantity) * params.unitPriceMinor;

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId ?? null,
    action: "invoice-line.created" as const,
    entityType: "invoice_line" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      invoiceId: params.invoiceId,
      lineNumber: String(params.lineNumber),
      amountMinor: String(amountMinor),
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(invoiceLine)
      .values({
        orgId,
        invoiceId: params.invoiceId,
        lineNumber: params.lineNumber,
        description: params.description,
        quantity: params.quantity,
        unitPriceMinor: params.unitPriceMinor,
        amountMinor,
        glAccountId: params.glAccountId ?? null,
        taxCode: params.taxCode ?? null,
      })
      .returning({ id: invoiceLine.id });

    if (!row) throw new Error("Failed to insert invoice line");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.INVOICE_LINE_CREATED",
      version: "1",
      correlationId,
      payload: {
        invoiceLineId: row.id,
        invoiceId: params.invoiceId,
        lineNumber: params.lineNumber,
      },
    });

    return { id: row.id as InvoiceLineId };
  });

  return { ok: true, data: result };
}

// ── Update Invoice Line ───────────────────────────────────────────────────────

export async function updateInvoiceLine(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: UpdateInvoiceLineParams,
): Promise<InvoiceLineServiceResult<{ id: InvoiceLineId }>> {
  const orgId = ctx.activeContext.orgId;

  const [existing] = await db
    .select({
      id: invoiceLine.id,
      invoiceId: invoiceLine.invoiceId,
      quantity: invoiceLine.quantity,
      unitPriceMinor: invoiceLine.unitPriceMinor,
    })
    .from(invoiceLine)
    .where(and(eq(invoiceLine.orgId, orgId), eq(invoiceLine.id, params.id)))
    .limit(1);

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "AP_INVOICE_LINE_NOT_FOUND",
        message: "Invoice line not found",
        meta: { id: params.id },
      },
    };
  }

  const draftCheck = await ensureInvoiceDraft(db, orgId, existing.invoiceId);
  if (!draftCheck.ok) return draftCheck;

  const quantity = params.quantity ?? existing.quantity;
  const unitPriceMinor = params.unitPriceMinor ?? existing.unitPriceMinor;
  const amountMinor = BigInt(quantity) * unitPriceMinor;

  const updates: Record<string, unknown> = {
    updatedAt: sql`now()`,
    amountMinor,
  };
  if (params.description !== undefined) updates.description = params.description;
  if (params.quantity !== undefined) updates.quantity = params.quantity;
  if (params.unitPriceMinor !== undefined) updates.unitPriceMinor = params.unitPriceMinor;
  if (params.glAccountId !== undefined) updates.glAccountId = params.glAccountId;
  if (params.taxCode !== undefined) updates.taxCode = params.taxCode;

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId ?? null,
    action: "invoice-line.updated" as const,
    entityType: "invoice_line" as const,
    entityId: params.id as unknown as EntityId,
    correlationId,
    details: { invoiceLineId: params.id },
  };

  await withAudit(db, ctx, auditEntry, async (tx) => {
    await tx
      .update(invoiceLine)
      .set(updates as Record<string, unknown>)
      .where(and(eq(invoiceLine.id, params.id), eq(invoiceLine.orgId, orgId)));

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.INVOICE_LINE_UPDATED",
      version: "1",
      correlationId,
      payload: {
        invoiceLineId: params.id,
        invoiceId: existing.invoiceId,
      },
    });
  });

  return { ok: true, data: { id: params.id } };
}

// ── Delete Invoice Line ───────────────────────────────────────────────────────

export async function deleteInvoiceLine(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  id: InvoiceLineId,
): Promise<InvoiceLineServiceResult<{ id: InvoiceLineId }>> {
  const orgId = ctx.activeContext.orgId;

  const [existing] = await db
    .select({ id: invoiceLine.id, invoiceId: invoiceLine.invoiceId })
    .from(invoiceLine)
    .where(and(eq(invoiceLine.orgId, orgId), eq(invoiceLine.id, id)))
    .limit(1);

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "AP_INVOICE_LINE_NOT_FOUND",
        message: "Invoice line not found",
        meta: { id },
      },
    };
  }

  const draftCheck = await ensureInvoiceDraft(db, orgId, existing.invoiceId);
  if (!draftCheck.ok) return draftCheck;

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId ?? null,
    action: "invoice-line.deleted" as const,
    entityType: "invoice_line" as const,
    entityId: id as unknown as EntityId,
    correlationId,
    details: { invoiceLineId: id, invoiceId: existing.invoiceId },
  };

  await withAudit(db, ctx, auditEntry, async (tx) => {
    await tx
      .delete(invoiceLine)
      .where(and(eq(invoiceLine.id, id), eq(invoiceLine.orgId, orgId)));

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.INVOICE_LINE_DELETED",
      version: "1",
      correlationId,
      payload: {
        invoiceLineId: id,
        invoiceId: existing.invoiceId,
      },
    });
  });

  return { ok: true, data: { id } };
}
