import type { DbClient } from "@afenda/db";
import { bankAccount, bankStatement, bankStatementLine, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  PrincipalId,
  BankAccountId,
  BankStatementId,
} from "@afenda/contracts";
import type { IngestBankStatementCommand, MarkStatementFailedCommand } from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

export type BankStatementServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type BankStatementServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: BankStatementServiceError };

/**
 * Ingest a bank statement — creates the header and all lines atomically.
 *
 * Guard: bank account must be active (inactive/suspended accounts cannot accept
 * new statements).
 * Guard: re-submitting the same sourceRef for the same bank account is idempotent
 * — returns the existing statement id without creating duplicates.
 */
export async function ingestBankStatement(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  cmd: IngestBankStatementCommand,
): Promise<BankStatementServiceResult<{ id: BankStatementId }>> {
  const orgId = ctx.activeContext.orgId;

  // Guard — bank account must exist and be active
  const [account] = await db
    .select({ id: bankAccount.id, status: bankAccount.status })
    .from(bankAccount)
    .where(and(eq(bankAccount.orgId, orgId), eq(bankAccount.id, cmd.bankAccountId as unknown as BankAccountId)));

  if (!account) {
    return {
      ok: false,
      error: { code: "TREAS_BANK_ACCOUNT_NOT_FOUND", message: "Bank account not found" },
    };
  }

  if (account.status !== "active") {
    return {
      ok: false,
      error: {
        code: "TREAS_BANK_ACCOUNT_INACTIVE",
        message: "Bank account must be active to accept a new statement",
        meta: { status: account.status },
      },
    };
  }

  // Idempotency — return existing statement if same sourceRef already ingested
  const [existing] = await db
    .select({ id: bankStatement.id })
    .from(bankStatement)
    .where(
      and(
        eq(bankStatement.orgId, orgId),
        eq(bankStatement.bankAccountId, cmd.bankAccountId as unknown as BankAccountId),
        eq(bankStatement.sourceRef, cmd.sourceRef),
      ),
    );

  if (existing) {
    return { ok: true, data: { id: existing.id as unknown as BankStatementId } };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.bank-statement.ingested" as const,
    entityType: "bank_statement" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      bankAccountId: String(cmd.bankAccountId),
      sourceRef: cmd.sourceRef,
      statementDate: String(cmd.statementDate),
      lineCount: String(cmd.lines.length),
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    // Convert date strings to Date objects if needed
    const stmtDate = typeof cmd.statementDate === 'string' 
      ? new Date(cmd.statementDate) // gate:allow-js-date — parsing ISO-8601 from API
      : cmd.statementDate;

    // Insert header
    const [header] = await tx
      .insert(bankStatement)
      .values({
        orgId,
        bankAccountId: cmd.bankAccountId as unknown as BankAccountId,
        sourceRef: cmd.sourceRef,
        statementDate: stmtDate,
        openingBalance: cmd.openingBalance,
        closingBalance: cmd.closingBalance,
        currencyCode: cmd.currencyCode,
        status: "processing",
        lineCount: cmd.lines.length,
      })
      .returning({ id: bankStatement.id });

    if (!header) throw new Error("Failed to create bank statement header");

    auditEntry.entityId = header.id as unknown as EntityId;

    // Insert all lines
    if (cmd.lines.length > 0) {
      await tx.insert(bankStatementLine).values(
        cmd.lines.map((line) => {
          const txnDate = typeof line.transactionDate === 'string'
            ? new Date(line.transactionDate) // gate:allow-js-date — parsing ISO-8601 from API
            : line.transactionDate;
          const valDate = line.valueDate
            ? (typeof line.valueDate === 'string'
              ? new Date(line.valueDate) // gate:allow-js-date — parsing ISO-8601 from API
              : line.valueDate)
            : null;

          return {
            orgId,
            statementId: header.id,
            lineNumber: line.lineNumber,
            transactionDate: txnDate,
            valueDate: valDate,
            description: line.description,
            reference: line.reference ?? null,
            amount: line.amount,
            direction: line.direction,
            status: "unmatched" as const,
          };
        }),
      );
    }

    // Mark header as processed
    await tx
      .update(bankStatement)
      .set({ status: "processed", updatedAt: sql`now()` })
      .where(eq(bankStatement.id, header.id));

    // Outbox event
    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.BANK_STATEMENT_INGESTED",
      version: "1",
      correlationId,
      payload: {
        statementId: header.id,
        bankAccountId: cmd.bankAccountId,
        sourceRef: cmd.sourceRef,
        lineCount: cmd.lines.length,
      },
    });

    return { id: header.id as unknown as BankStatementId };
  });

  return { ok: true, data: result };
}

/**
 * Mark a bank statement as failed — used by a worker when processing fails.
 * No-op if the statement is already in a terminal state.
 */
export async function markStatementFailed(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  cmd: MarkStatementFailedCommand,
): Promise<BankStatementServiceResult<{ id: BankStatementId }>> {
  const orgId = ctx.activeContext.orgId;

  const [existing] = await db
    .select({ id: bankStatement.id, status: bankStatement.status })
    .from(bankStatement)
    .where(and(eq(bankStatement.orgId, orgId), eq(bankStatement.id, cmd.statementId as unknown as BankStatementId)));

  if (!existing) {
    return {
      ok: false,
      error: { code: "TREAS_BANK_STATEMENT_NOT_FOUND", message: "Bank statement not found" },
    };
  }

  if (existing.status === "processed" || existing.status === "failed") {
    return { ok: true, data: { id: existing.id as unknown as BankStatementId } };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "treasury.bank-statement.ingested" as const,
      entityType: "bank_statement" as const,
      entityId: cmd.statementId as unknown as EntityId,
      correlationId,
      details: { failureReason: cmd.failureReason },
    },
    async (tx) => {
      await tx
        .update(bankStatement)
        .set({
          status: "failed",
          failureReason: cmd.failureReason,
          updatedAt: sql`now()`,
        })
        .where(and(eq(bankStatement.id, cmd.statementId as unknown as BankStatementId), eq(bankStatement.orgId, orgId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "TREAS.BANK_STATEMENT_FAILED",
        version: "1",
        correlationId,
        payload: { statementId: cmd.statementId, failureReason: cmd.failureReason },
      });
    },
  );

  return { ok: true, data: { id: cmd.statementId } };
}
