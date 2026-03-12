import type { DbClient } from "@afenda/db";
import { treasuryPaymentInstruction, bankAccount, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  PrincipalId,
  OrgId,
  BankAccountId,
  PaymentInstructionId,
  TreasuryPaymentMethod,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

export type PaymentInstructionServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type PaymentInstructionServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PaymentInstructionServiceError };

export interface CreatePaymentInstructionParams {
  sourceBankAccountId: BankAccountId;
  beneficiaryName: string;
  beneficiaryAccountNumber: string;
  beneficiaryBankCode?: string | null;
  amountMinor: string;
  currencyCode: string;
  paymentMethod: TreasuryPaymentMethod;
  reference?: string | null;
  requestedExecutionDate: string;
}

export interface SubmitPaymentInstructionParams {
  paymentInstructionId: PaymentInstructionId;
}

export interface ApprovePaymentInstructionParams {
  paymentInstructionId: PaymentInstructionId;
}

export interface RejectPaymentInstructionParams {
  paymentInstructionId: PaymentInstructionId;
  rejectionReason: string;
}

export async function createPaymentInstruction(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CreatePaymentInstructionParams,
): Promise<PaymentInstructionServiceResult<{ id: PaymentInstructionId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  // Verify source bank account exists and belongs to this org
  const [account] = await db
    .select({ id: bankAccount.id, status: bankAccount.status, currencyCode: bankAccount.currencyCode })
    .from(bankAccount)
    .where(and(eq(bankAccount.orgId, orgId), eq(bankAccount.id, params.sourceBankAccountId)));

  if (!account) {
    return {
      ok: false,
      error: { code: "TREAS_PAYMENT_INSTRUCTION_INVALID_BANK_ACCOUNT", message: "Source bank account not found" },
    };
  }

  if (account.status !== "active") {
    return {
      ok: false,
      error: {
        code: "TREAS_PAYMENT_INSTRUCTION_BANK_ACCOUNT_MISSING",
        message: "Source bank account is not active",
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.payment-instruction.created" as const,
    entityType: "treasury_payment_instruction" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      sourceBankAccountId: params.sourceBankAccountId,
      amountMinor: params.amountMinor,
      currencyCode: params.currencyCode,
      paymentMethod: params.paymentMethod,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(treasuryPaymentInstruction)
      .values({
        orgId,
        sourceBankAccountId: params.sourceBankAccountId,
        beneficiaryName: params.beneficiaryName,
        beneficiaryAccountNumber: params.beneficiaryAccountNumber,
        beneficiaryBankCode: params.beneficiaryBankCode ?? null,
        amountMinor: params.amountMinor,
        currencyCode: params.currencyCode,
        paymentMethod: params.paymentMethod,
        reference: params.reference ?? null,
        requestedExecutionDate: params.requestedExecutionDate,
        status: "pending",
        createdByPrincipalId: policyCtx.principalId ?? null,
      })
      .returning({ id: treasuryPaymentInstruction.id });

    if (!row) throw new Error("Failed to create payment instruction");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.PAYMENT_INSTRUCTION_CREATED",
      version: "1",
      correlationId,
      payload: {
        paymentInstructionId: row.id,
        amountMinor: params.amountMinor,
        currencyCode: params.currencyCode,
      },
    });

    return { id: row.id as PaymentInstructionId };
  });

  return { ok: true, data: result };
}

export async function submitPaymentInstruction(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: SubmitPaymentInstructionParams,
): Promise<PaymentInstructionServiceResult<{ id: PaymentInstructionId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [instruction] = await db
    .select({
      id: treasuryPaymentInstruction.id,
      status: treasuryPaymentInstruction.status,
    })
    .from(treasuryPaymentInstruction)
    .where(
      and(
        eq(treasuryPaymentInstruction.orgId, orgId),
        eq(treasuryPaymentInstruction.id, params.paymentInstructionId),
      ),
    );

  if (!instruction) {
    return {
      ok: false,
      error: { code: "TREAS_PAYMENT_INSTRUCTION_NOT_FOUND", message: "Payment instruction not found" },
    };
  }

  if (instruction.status !== "pending") {
    return {
      ok: false,
      error: {
        code: "TREAS_PAYMENT_INSTRUCTION_ILLEGAL_TRANSITION",
        message: `Cannot submit instruction in status '${instruction.status}'`,
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "treasury.payment-instruction.submitted" as const,
      entityType: "treasury_payment_instruction" as const,
      entityId: params.paymentInstructionId as unknown as EntityId,
      correlationId,
      details: {},
    },
    async (tx) => {
      await tx
        .update(treasuryPaymentInstruction)
        .set({ status: "processing", submittedAt: sql`now()`, updatedAt: sql`now()` })
        .where(
          and(
            eq(treasuryPaymentInstruction.orgId, orgId),
            eq(treasuryPaymentInstruction.id, params.paymentInstructionId),
          ),
        );

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.PAYMENT_INSTRUCTION_SUBMITTED",
        version: "1",
        correlationId,
        payload: { paymentInstructionId: params.paymentInstructionId },
      });
    },
  );

  return { ok: true, data: { id: params.paymentInstructionId } };
}

export async function approvePaymentInstruction(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: ApprovePaymentInstructionParams,
): Promise<PaymentInstructionServiceResult<{ id: PaymentInstructionId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [instruction] = await db
    .select({
      id: treasuryPaymentInstruction.id,
      status: treasuryPaymentInstruction.status,
      createdByPrincipalId: treasuryPaymentInstruction.createdByPrincipalId,
    })
    .from(treasuryPaymentInstruction)
    .where(
      and(
        eq(treasuryPaymentInstruction.orgId, orgId),
        eq(treasuryPaymentInstruction.id, params.paymentInstructionId),
      ),
    );

  if (!instruction) {
    return {
      ok: false,
      error: { code: "TREAS_PAYMENT_INSTRUCTION_NOT_FOUND", message: "Payment instruction not found" },
    };
  }

  if (instruction.status !== "processing") {
    return {
      ok: false,
      error: {
        code: "TREAS_PAYMENT_INSTRUCTION_ILLEGAL_TRANSITION",
        message: `Cannot approve instruction in status '${instruction.status}'`,
      },
    };
  }

  // Segregation of Duties — creator cannot approve
  if (
    policyCtx.principalId &&
    instruction.createdByPrincipalId &&
    policyCtx.principalId === instruction.createdByPrincipalId
  ) {
    return {
      ok: false,
      error: {
        code: "TREAS_PAYMENT_SOD_VIOLATION",
        message: "The creator of a payment instruction cannot approve it",
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "treasury.payment-instruction.approved" as const,
      entityType: "treasury_payment_instruction" as const,
      entityId: params.paymentInstructionId as unknown as EntityId,
      correlationId,
      details: {},
    },
    async (tx) => {
      await tx
        .update(treasuryPaymentInstruction)
        .set({ approvedAt: sql`now()`, updatedAt: sql`now()` })
        .where(
          and(
            eq(treasuryPaymentInstruction.orgId, orgId),
            eq(treasuryPaymentInstruction.id, params.paymentInstructionId),
          ),
        );

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.PAYMENT_INSTRUCTION_APPROVED",
        version: "1",
        correlationId,
        payload: { paymentInstructionId: params.paymentInstructionId },
      });
    },
  );

  return { ok: true, data: { id: params.paymentInstructionId } };
}

export async function rejectPaymentInstruction(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: RejectPaymentInstructionParams,
): Promise<PaymentInstructionServiceResult<{ id: PaymentInstructionId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [instruction] = await db
    .select({ id: treasuryPaymentInstruction.id, status: treasuryPaymentInstruction.status })
    .from(treasuryPaymentInstruction)
    .where(
      and(
        eq(treasuryPaymentInstruction.orgId, orgId),
        eq(treasuryPaymentInstruction.id, params.paymentInstructionId),
      ),
    );

  if (!instruction) {
    return {
      ok: false,
      error: { code: "TREAS_PAYMENT_INSTRUCTION_NOT_FOUND", message: "Payment instruction not found" },
    };
  }

  if (instruction.status !== "processing") {
    return {
      ok: false,
      error: {
        code: "TREAS_PAYMENT_INSTRUCTION_ILLEGAL_TRANSITION",
        message: `Cannot reject instruction in status '${instruction.status}'`,
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "treasury.payment-instruction.rejected" as const,
      entityType: "treasury_payment_instruction" as const,
      entityId: params.paymentInstructionId as unknown as EntityId,
      correlationId,
      details: { rejectionReason: params.rejectionReason },
    },
    async (tx) => {
      await tx
        .update(treasuryPaymentInstruction)
        .set({
          status: "rejected",
          rejectedAt: sql`now()`,
          rejectionReason: params.rejectionReason,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(treasuryPaymentInstruction.orgId, orgId),
            eq(treasuryPaymentInstruction.id, params.paymentInstructionId),
          ),
        );

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.PAYMENT_INSTRUCTION_REJECTED",
        version: "1",
        correlationId,
        payload: {
          paymentInstructionId: params.paymentInstructionId,
          rejectionReason: params.rejectionReason,
        },
      });
    },
  );

  return { ok: true, data: { id: params.paymentInstructionId } };
}
