import type { DbClient } from "@afenda/db";
import { treasuryPaymentBatch, treasuryPaymentBatchItem, treasuryPaymentInstruction, bankAccount, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  PrincipalId,
  OrgId,
  BankAccountId,
  PaymentBatchId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";
import { addMinor } from "./calculators/reconciliation.calculator";

export type PaymentBatchServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type PaymentBatchServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PaymentBatchServiceError };

export interface CreatePaymentBatchParams {
  sourceBankAccountId: BankAccountId;
  paymentInstructionIds: string[];
  description?: string | null;
}

export interface RequestPaymentBatchReleaseParams {
  batchId: PaymentBatchId;
}

export interface ReleasePaymentBatchParams {
  batchId: PaymentBatchId;
}

export async function createPaymentBatch(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CreatePaymentBatchParams,
): Promise<PaymentBatchServiceResult<{ id: PaymentBatchId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  if (params.paymentInstructionIds.length === 0) {
    return {
      ok: false,
      error: { code: "TREAS_PAYMENT_BATCH_EMPTY", message: "Payment batch must contain at least one instruction" },
    };
  }

  // Verify source bank account
  const [account] = await db
    .select({ id: bankAccount.id, status: bankAccount.status })
    .from(bankAccount)
    .where(and(eq(bankAccount.orgId, orgId), eq(bankAccount.id, params.sourceBankAccountId)));

  if (!account || account.status !== "active") {
    return {
      ok: false,
      error: {
        code: "TREAS_PAYMENT_INSTRUCTION_INVALID_BANK_ACCOUNT",
        message: "Source bank account not found or not active",
      },
    };
  }

  // Load all instructions to verify they are all in "processing" status and belong to this org
  const instructions = await db
    .select({
      id: treasuryPaymentInstruction.id,
      status: treasuryPaymentInstruction.status,
      amountMinor: treasuryPaymentInstruction.amountMinor,
      sourceBankAccountId: treasuryPaymentInstruction.sourceBankAccountId,
      currencyCode: treasuryPaymentInstruction.currencyCode,
    })
    .from(treasuryPaymentInstruction)
    .where(
      and(
        eq(treasuryPaymentInstruction.orgId, orgId),
        sql`${treasuryPaymentInstruction.id} = ANY(${params.paymentInstructionIds}::uuid[])`,
      ),
    );

  if (instructions.length !== params.paymentInstructionIds.length) {
    return {
      ok: false,
      error: {
        code: "TREAS_PAYMENT_BATCH_INSTRUCTION_NOT_FOUND",
        message: "One or more payment instructions not found",
      },
    };
  }

  // All instructions must be in "processing" (submitted and awaiting approval — but approved means they have approvedAt)
  // For Wave 2, "processing" covers submitted; batch accepts processing instructions
  const notApproved = instructions.filter((i) => i.status !== "processing");
  if (notApproved.length > 0) {
    return {
      ok: false,
      error: {
        code: "TREAS_PAYMENT_BATCH_INSTRUCTION_NOT_APPROVED",
        message: `${notApproved.length} instruction(s) are not in processing status`,
      },
    };
  }

  // All instructions must share the same source bank account (dimension check)
  const wrongAccount = instructions.filter((i) => i.sourceBankAccountId !== params.sourceBankAccountId);
  if (wrongAccount.length > 0) {
    return {
      ok: false,
      error: {
        code: "TREAS_PAYMENT_BATCH_DIMENSION_MISMATCH",
        message: "All payment instructions must share the same source bank account",
      },
    };
  }

  // Calculate total
  const totalAmountMinor = instructions.reduce((acc, i) => addMinor(acc, i.amountMinor), "0");

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.payment-batch.created" as const,
    entityType: "treasury_payment_batch" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      sourceBankAccountId: params.sourceBankAccountId,
      itemCount: String(params.paymentInstructionIds.length),
      totalAmountMinor,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [batch] = await tx
      .insert(treasuryPaymentBatch)
      .values({
        orgId,
        sourceBankAccountId: params.sourceBankAccountId,
        description: params.description ?? null,
        status: "draft",
        totalAmountMinor,
        itemCount: instructions.length,
      })
      .returning({ id: treasuryPaymentBatch.id });

    if (!batch) throw new Error("Failed to create payment batch");

    auditEntry.entityId = batch.id as unknown as EntityId;

    // Insert batch items
    await tx.insert(treasuryPaymentBatchItem).values(
      instructions.map((instr) => ({
        orgId,
        batchId: batch.id,
        paymentInstructionId: instr.id,
        amountMinor: instr.amountMinor,
      })),
    );

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.PAYMENT_BATCH_CREATED",
      version: "1",
      correlationId,
      payload: {
        batchId: batch.id,
        itemCount: instructions.length,
        totalAmountMinor,
      },
    });

    return { id: batch.id as PaymentBatchId };
  });

  return { ok: true, data: result };
}

export async function requestPaymentBatchRelease(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: RequestPaymentBatchReleaseParams,
): Promise<PaymentBatchServiceResult<{ id: PaymentBatchId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [batch] = await db
    .select({ id: treasuryPaymentBatch.id, status: treasuryPaymentBatch.status })
    .from(treasuryPaymentBatch)
    .where(and(eq(treasuryPaymentBatch.orgId, orgId), eq(treasuryPaymentBatch.id, params.batchId)));

  if (!batch) {
    return {
      ok: false,
      error: { code: "TREAS_PAYMENT_BATCH_NOT_FOUND", message: "Payment batch not found" },
    };
  }

  if (batch.status !== "draft") {
    return {
      ok: false,
      error: {
        code: "TREAS_PAYMENT_BATCH_NOT_DRAFT",
        message: `Cannot request release for batch in status '${batch.status}'`,
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "treasury.payment-batch.request-release" as const,
      entityType: "treasury_payment_batch" as const,
      entityId: params.batchId as unknown as EntityId,
      correlationId,
      details: {},
    },
    async (tx) => {
      await tx
        .update(treasuryPaymentBatch)
        .set({ status: "pending_approval", requestedReleaseAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(treasuryPaymentBatch.orgId, orgId), eq(treasuryPaymentBatch.id, params.batchId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.PAYMENT_BATCH_RELEASE_REQUESTED",
        version: "1",
        correlationId,
        payload: { batchId: params.batchId },
      });
    },
  );

  return { ok: true, data: { id: params.batchId } };
}

export async function releasePaymentBatch(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: ReleasePaymentBatchParams,
): Promise<PaymentBatchServiceResult<{ id: PaymentBatchId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [batch] = await db
    .select({
      id: treasuryPaymentBatch.id,
      status: treasuryPaymentBatch.status,
      totalAmountMinor: treasuryPaymentBatch.totalAmountMinor,
    })
    .from(treasuryPaymentBatch)
    .where(and(eq(treasuryPaymentBatch.orgId, orgId), eq(treasuryPaymentBatch.id, params.batchId)));

  if (!batch) {
    return {
      ok: false,
      error: { code: "TREAS_PAYMENT_BATCH_NOT_FOUND", message: "Payment batch not found" },
    };
  }

  if (batch.status === "released") {
    return {
      ok: false,
      error: { code: "TREAS_PAYMENT_BATCH_ALREADY_RELEASED", message: "Payment batch is already released" },
    };
  }

  if (batch.status === "cancelled") {
    return {
      ok: false,
      error: { code: "TREAS_PAYMENT_BATCH_CANCELLED", message: "Payment batch is cancelled" },
    };
  }

  if (batch.status !== "pending_approval" && batch.status !== "approved") {
    return {
      ok: false,
      error: {
        code: "TREAS_PAYMENT_BATCH_ILLEGAL_TRANSITION",
        message: `Cannot release batch in status '${batch.status}'`,
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "treasury.payment-batch.released" as const,
      entityType: "treasury_payment_batch" as const,
      entityId: params.batchId as unknown as EntityId,
      correlationId,
      details: { totalAmountMinor: batch.totalAmountMinor },
    },
    async (tx) => {
      await tx
        .update(treasuryPaymentBatch)
        .set({ status: "released", approvedAt: sql`now()`, releasedAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(treasuryPaymentBatch.orgId, orgId), eq(treasuryPaymentBatch.id, params.batchId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.PAYMENT_BATCH_RELEASED",
        version: "1",
        correlationId,
        payload: {
          batchId: params.batchId,
          totalAmountMinor: batch.totalAmountMinor,
        },
      });
    },
  );

  return { ok: true, data: { id: params.batchId } };
}
