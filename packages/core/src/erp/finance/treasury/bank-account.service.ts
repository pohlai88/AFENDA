import type { DbClient } from "@afenda/db";
import { bankAccount, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type { CorrelationId, EntityId, PrincipalId, BankAccountId } from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

export type BankAccountServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type BankAccountServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: BankAccountServiceError };

export interface CreateBankAccountParams {
  accountName: string;
  bankName: string;
  accountNumber: string;
  currencyCode: string;
  bankIdentifierCode?: string;
  externalBankRef?: string;
  isPrimary?: boolean;
}

export interface UpdateBankAccountParams {
  id: BankAccountId;
  accountName?: string;
  bankName?: string;
  accountNumber?: string;
  currencyCode?: string;
  bankIdentifierCode?: string | null;
  externalBankRef?: string | null;
  isPrimary?: boolean;
}

export interface TransitionBankAccountParams {
  id: BankAccountId;
}

export async function createBankAccount(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CreateBankAccountParams,
): Promise<BankAccountServiceResult<{ id: BankAccountId }>> {
  const orgId = ctx.activeContext.orgId;

  const [existing] = await db
    .select({ id: bankAccount.id })
    .from(bankAccount)
    .where(and(eq(bankAccount.orgId, orgId), eq(bankAccount.accountNumber, params.accountNumber)));

  if (existing) {
    return {
      ok: false,
      error: {
        code: "TREAS_BANK_ACCOUNT_NUMBER_EXISTS",
        message: "A bank account with that account number already exists",
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.bank-account.created" as const,
    entityType: "bank_account" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      accountName: params.accountName,
      bankName: params.bankName,
      currencyCode: params.currencyCode,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(bankAccount)
      .values({
        orgId,
        accountName: params.accountName,
        bankName: params.bankName,
        accountNumber: params.accountNumber,
        currencyCode: params.currencyCode,
        bankIdentifierCode: params.bankIdentifierCode ?? null,
        externalBankRef: params.externalBankRef ?? null,
        isPrimary: params.isPrimary ?? false,
      })
      .returning({ id: bankAccount.id });

    if (!row) throw new Error("Failed to create bank account");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.BANK_ACCOUNT_CREATED",
      version: "1",
      correlationId,
      payload: {
        bankAccountId: row.id,
        status: "inactive",
      },
    });

    return { id: row.id as BankAccountId };
  });

  return { ok: true, data: result };
}

export async function updateBankAccount(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: UpdateBankAccountParams,
): Promise<BankAccountServiceResult<{ id: BankAccountId }>> {
  const orgId = ctx.activeContext.orgId;

  const [existing] = await db
    .select({ id: bankAccount.id, status: bankAccount.status })
    .from(bankAccount)
    .where(and(eq(bankAccount.orgId, orgId), eq(bankAccount.id, params.id)));

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "TREAS_BANK_ACCOUNT_NOT_FOUND",
        message: "Bank account not found",
      },
    };
  }

  if (params.accountNumber) {
    const [duplicate] = await db
      .select({ id: bankAccount.id })
      .from(bankAccount)
      .where(and(eq(bankAccount.orgId, orgId), eq(bankAccount.accountNumber, params.accountNumber)));

    if (duplicate && duplicate.id !== params.id) {
      return {
        ok: false,
        error: {
          code: "TREAS_BANK_ACCOUNT_NUMBER_EXISTS",
          message: "A bank account with that account number already exists",
        },
      };
    }
  }

  const updates: Record<string, unknown> = { updatedAt: sql`now()` };
  if (params.accountName !== undefined) updates.accountName = params.accountName;
  if (params.bankName !== undefined) updates.bankName = params.bankName;
  if (params.accountNumber !== undefined) updates.accountNumber = params.accountNumber;
  if (params.currencyCode !== undefined) updates.currencyCode = params.currencyCode;
  if (params.bankIdentifierCode !== undefined) updates.bankIdentifierCode = params.bankIdentifierCode;
  if (params.externalBankRef !== undefined) updates.externalBankRef = params.externalBankRef;
  if (params.isPrimary !== undefined) updates.isPrimary = params.isPrimary;

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "treasury.bank-account.updated" as const,
      entityType: "bank_account" as const,
      entityId: params.id as unknown as EntityId,
      correlationId,
      details: Object.fromEntries(
        Object.entries(updates)
          .filter(([k]) => k !== "updatedAt")
          .map(([k, v]) => [k, String(v)]),
      ),
    },
    async (tx) => {
      await tx
        .update(bankAccount)
        .set(updates)
        .where(and(eq(bankAccount.id, params.id), eq(bankAccount.orgId, orgId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.BANK_ACCOUNT_UPDATED",
        version: "1",
        correlationId,
        payload: {
          bankAccountId: params.id,
          updatedFields: Object.keys(updates).filter((k) => k !== "updatedAt"),
        },
      });
    },
  );

  return { ok: true, data: { id: params.id } };
}

export async function activateBankAccount(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: TransitionBankAccountParams,
): Promise<BankAccountServiceResult<{ id: BankAccountId }>> {
  const orgId = ctx.activeContext.orgId;

  const [existing] = await db
    .select({ id: bankAccount.id, status: bankAccount.status })
    .from(bankAccount)
    .where(and(eq(bankAccount.orgId, orgId), eq(bankAccount.id, params.id)));

  if (!existing) {
    return {
      ok: false,
      error: { code: "TREAS_BANK_ACCOUNT_NOT_FOUND", message: "Bank account not found" },
    };
  }

  if (existing.status === "suspended") {
    return {
      ok: false,
      error: { code: "TREAS_BANK_ACCOUNT_SUSPENDED", message: "Suspended bank account cannot be activated" },
    };
  }

  if (existing.status === "active") {
    return { ok: true, data: { id: params.id } };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "treasury.bank-account.activated" as const,
      entityType: "bank_account" as const,
      entityId: params.id as unknown as EntityId,
      correlationId,
    },
    async (tx) => {
      await tx
        .update(bankAccount)
        .set({ status: "active", activatedAt: sql`now()`, deactivatedAt: null, updatedAt: sql`now()` })
        .where(and(eq(bankAccount.id, params.id), eq(bankAccount.orgId, orgId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.BANK_ACCOUNT_ACTIVATED",
        version: "1",
        correlationId,
        payload: { bankAccountId: params.id },
      });
    },
  );

  return { ok: true, data: { id: params.id } };
}

export async function deactivateBankAccount(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: TransitionBankAccountParams,
): Promise<BankAccountServiceResult<{ id: BankAccountId }>> {
  const orgId = ctx.activeContext.orgId;

  const [existing] = await db
    .select({ id: bankAccount.id, status: bankAccount.status })
    .from(bankAccount)
    .where(and(eq(bankAccount.orgId, orgId), eq(bankAccount.id, params.id)));

  if (!existing) {
    return {
      ok: false,
      error: { code: "TREAS_BANK_ACCOUNT_NOT_FOUND", message: "Bank account not found" },
    };
  }

  if (existing.status === "inactive") {
    return { ok: true, data: { id: params.id } };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "treasury.bank-account.deactivated" as const,
      entityType: "bank_account" as const,
      entityId: params.id as unknown as EntityId,
      correlationId,
    },
    async (tx) => {
      await tx
        .update(bankAccount)
        .set({ status: "inactive", deactivatedAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(bankAccount.id, params.id), eq(bankAccount.orgId, orgId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.BANK_ACCOUNT_DEACTIVATED",
        version: "1",
        correlationId,
        payload: { bankAccountId: params.id },
      });
    },
  );

  return { ok: true, data: { id: params.id } };
}
