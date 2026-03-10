/**
 * Prepayment service — create, apply, void prepayment.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Emits an outbox event inside the same transaction.
 *
 * RULES:
 *   - No HTTP/Fastify imports — pure domain service.
 *   - Error codes: AP_PREPAYMENT_* from @afenda/contracts.
 *   - Use sql`now()` for timestamps.
 */

import type { DbClient } from "@afenda/db";
import { prepayment, prepaymentApplication, supplier, invoice, outboxEvent } from "@afenda/db";
import { eq, and, sql } from "drizzle-orm";
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

// ── Apply Prepayment ─────────────────────────────────────────────────────────

export interface ApplyPrepaymentParams {
  prepaymentId: string;
  invoiceId: string;
  amountMinor: bigint;
}

export async function applyPrepayment(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: ApplyPrepaymentParams,
): Promise<PrepaymentServiceResult<{ applicationId: string }>> {
  const orgId = ctx.activeContext.orgId;

  const [prepRow] = await db
    .select()
    .from(prepayment)
    .where(and(eq(prepayment.orgId, orgId), eq(prepayment.id, params.prepaymentId)))
    .limit(1);

  if (!prepRow) {
    return {
      ok: false,
      error: {
        code: "AP_PREPAYMENT_NOT_FOUND",
        message: "Prepayment not found",
        meta: { prepaymentId: params.prepaymentId },
      },
    };
  }

  if (prepRow.status === "DEPLETED" || prepRow.status === "VOIDED") {
    return {
      ok: false,
      error: {
        code: "AP_PREPAYMENT_ALREADY_VOIDED",
        message:
          prepRow.status === "VOIDED"
            ? "Prepayment has been voided"
            : "Prepayment balance is depleted",
        meta: { prepaymentId: params.prepaymentId },
      },
    };
  }

  if (params.amountMinor > prepRow.balanceMinor) {
    return {
      ok: false,
      error: {
        code: "AP_PREPAYMENT_INSUFFICIENT_BALANCE",
        message: "Amount exceeds available prepayment balance",
        meta: {
          prepaymentId: params.prepaymentId,
          balanceMinor: String(prepRow.balanceMinor),
        },
      },
    };
  }

  const [invRow] = await db
    .select({ id: invoice.id, supplierId: invoice.supplierId, currencyCode: invoice.currencyCode })
    .from(invoice)
    .where(and(eq(invoice.orgId, orgId), eq(invoice.id, params.invoiceId)))
    .limit(1);

  if (!invRow) {
    return {
      ok: false,
      error: {
        code: "AP_INVOICE_NOT_FOUND",
        message: "Invoice not found",
        meta: { invoiceId: params.invoiceId },
      },
    };
  }

  if (invRow.supplierId !== prepRow.supplierId) {
    return {
      ok: false,
      error: {
        code: "AP_PREPAYMENT_SUPPLIER_MISMATCH",
        message: "Prepayment and invoice must be for the same supplier",
        meta: { prepaymentId: params.prepaymentId, invoiceId: params.invoiceId },
      },
    };
  }

  if (invRow.currencyCode !== prepRow.currencyCode) {
    return {
      ok: false,
      error: {
        code: "AP_PREPAYMENT_CURRENCY_MISMATCH",
        message: "Prepayment and invoice must use the same currency",
        meta: { prepaymentId: params.prepaymentId, invoiceId: params.invoiceId },
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId ?? null,
    action: "prepayment.applied" as const,
    entityType: "prepayment" as const,
    entityId: params.prepaymentId as EntityId,
    correlationId,
    details: {
      prepaymentId: params.prepaymentId,
      invoiceId: params.invoiceId,
      amountMinor: String(params.amountMinor),
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [appRow] = await tx
      .insert(prepaymentApplication)
      .values({
        orgId,
        prepaymentId: params.prepaymentId,
        invoiceId: params.invoiceId,
        appliedAmountMinor: params.amountMinor,
        appliedAt: sql`now()`,
        appliedByPrincipalId: policyCtx.principalId ?? null,
      })
      .returning({ id: prepaymentApplication.id });

    if (!appRow) throw new Error("Failed to insert prepayment application");

    const newBalance = prepRow.balanceMinor - params.amountMinor;
    const newStatus = newBalance === 0n ? "DEPLETED" : prepRow.status;

    await tx
      .update(prepayment)
      .set({
        balanceMinor: newBalance,
        status: newStatus,
        updatedAt: sql`now()`,
      })
      .where(eq(prepayment.id, params.prepaymentId));

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.PREPAYMENT_APPLIED",
      version: "1",
      correlationId,
      payload: {
        prepaymentId: params.prepaymentId,
        invoiceId: params.invoiceId,
        applicationId: appRow.id,
        amountMinor: String(params.amountMinor),
      },
    });

    return { applicationId: appRow.id };
  });

  return { ok: true, data: result };
}

// ── Void Prepayment ──────────────────────────────────────────────────────────

export interface VoidPrepaymentParams {
  prepaymentId: string;
  reason: string;
}

export async function voidPrepayment(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: VoidPrepaymentParams,
): Promise<PrepaymentServiceResult<{ id: string }>> {
  const orgId = ctx.activeContext.orgId;

  const [prepRow] = await db
    .select()
    .from(prepayment)
    .where(and(eq(prepayment.orgId, orgId), eq(prepayment.id, params.prepaymentId)))
    .limit(1);

  if (!prepRow) {
    return {
      ok: false,
      error: {
        code: "AP_PREPAYMENT_NOT_FOUND",
        message: "Prepayment not found",
        meta: { prepaymentId: params.prepaymentId },
      },
    };
  }

  if (prepRow.status === "VOIDED") {
    return {
      ok: false,
      error: {
        code: "AP_PREPAYMENT_ALREADY_VOIDED",
        message: "Prepayment has already been voided",
        meta: { prepaymentId: params.prepaymentId },
      },
    };
  }

  if (prepRow.status === "DEPLETED") {
    return {
      ok: false,
      error: {
        code: "AP_PREPAYMENT_ALREADY_VOIDED",
        message: "Cannot void depleted prepayment",
        meta: { prepaymentId: params.prepaymentId },
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId ?? null,
    action: "prepayment.voided" as const,
    entityType: "prepayment" as const,
    entityId: params.prepaymentId as EntityId,
    correlationId,
    details: {
      prepaymentId: params.prepaymentId,
      reason: params.reason,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    await tx
      .update(prepayment)
      .set({
        status: "VOIDED",
        updatedAt: sql`now()`,
      })
      .where(eq(prepayment.id, params.prepaymentId));

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.PREPAYMENT_VOIDED",
      version: "1",
      correlationId,
      payload: {
        prepaymentId: params.prepaymentId,
        reason: params.reason,
      },
    });

    return { id: params.prepaymentId };
  });

  return { ok: true, data: result };
}
