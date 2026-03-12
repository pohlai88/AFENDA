import type { DbClient } from "@afenda/db";
import { treasuryReconciliationSession, treasuryReconciliationMatch, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  PrincipalId,
  OrgId,
  BankAccountId,
  ReconciliationSessionId,
  ReconciliationMatchId,
  ReconciliationTargetType,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";
import { addMinor, lteMinor } from "./calculators/reconciliation.calculator";

export type ReconciliationSessionServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type ReconciliationSessionServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ReconciliationSessionServiceError };

export interface OpenReconciliationSessionParams {
  bankAccountId: BankAccountId;
  bankStatementId: string;
  toleranceMinor?: string;
}

export interface AddReconciliationMatchParams {
  sessionId: ReconciliationSessionId;
  statementLineId: string;
  statementLineAmountMinor: string;
  targetType: ReconciliationTargetType;
  targetId: string;
  matchedAmountMinor: string;
}

export interface RemoveReconciliationMatchParams {
  sessionId: ReconciliationSessionId;
  matchId: ReconciliationMatchId;
}

export interface CloseReconciliationSessionParams {
  sessionId: ReconciliationSessionId;
}

export async function openReconciliationSession(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: OpenReconciliationSessionParams,
): Promise<ReconciliationSessionServiceResult<{ id: ReconciliationSessionId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  // One session per statement — enforced at DB level too via unique constraint
  const [existing] = await db
    .select({ id: treasuryReconciliationSession.id })
    .from(treasuryReconciliationSession)
    .where(
      and(
        eq(treasuryReconciliationSession.orgId, orgId),
        eq(treasuryReconciliationSession.bankStatementId, params.bankStatementId),
      ),
    );

  if (existing) {
    return {
      ok: false,
      error: {
        code: "TREAS_RECONCILIATION_SESSION_NOT_FOUND",
        message: "A reconciliation session already exists for this bank statement",
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.reconciliation-session.opened" as const,
    entityType: "reconciliation_session" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      bankAccountId: params.bankAccountId,
      bankStatementId: params.bankStatementId,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(treasuryReconciliationSession)
      .values({
        orgId,
        bankAccountId: params.bankAccountId,
        bankStatementId: params.bankStatementId,
        toleranceMinor: params.toleranceMinor ?? "0",
        status: "open",
      })
      .returning({ id: treasuryReconciliationSession.id });

    if (!row) throw new Error("Failed to open reconciliation session");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.RECONCILIATION_SESSION_OPENED",
      version: "1",
      correlationId,
      payload: {
        reconciliationSessionId: row.id,
        bankAccountId: params.bankAccountId,
        bankStatementId: params.bankStatementId,
      },
    });

    return { id: row.id as ReconciliationSessionId };
  });

  return { ok: true, data: result };
}

export async function addReconciliationMatch(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: AddReconciliationMatchParams,
): Promise<ReconciliationSessionServiceResult<{ id: ReconciliationMatchId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [session] = await db
    .select({ id: treasuryReconciliationSession.id, status: treasuryReconciliationSession.status })
    .from(treasuryReconciliationSession)
    .where(
      and(
        eq(treasuryReconciliationSession.orgId, orgId),
        eq(treasuryReconciliationSession.id, params.sessionId),
      ),
    );

  if (!session) {
    return {
      ok: false,
      error: { code: "TREAS_RECONCILIATION_SESSION_NOT_FOUND", message: "Reconciliation session not found" },
    };
  }

  if (session.status === "closed") {
    return {
      ok: false,
      error: { code: "TREAS_RECONCILIATION_SESSION_CLOSED", message: "Reconciliation session is already closed" },
    };
  }

  if (session.status === "voided") {
    return {
      ok: false,
      error: { code: "TREAS_RECONCILIATION_SESSION_VOIDED", message: "Reconciliation session is voided" },
    };
  }

  // Verify match amount does not exceed statement line amount
  if (!lteMinor(params.matchedAmountMinor, params.statementLineAmountMinor)) {
    return {
      ok: false,
      error: {
        code: "TREAS_RECONCILIATION_MATCH_EXCEEDS_LINE_AMOUNT",
        message: "Matched amount exceeds statement line amount",
      },
    };
  }

  // Check if this statement line already has an active match in any session for this org
  const [existingMatch] = await db
    .select({ id: treasuryReconciliationMatch.id })
    .from(treasuryReconciliationMatch)
    .where(
      and(
        eq(treasuryReconciliationMatch.orgId, orgId),
        eq(treasuryReconciliationMatch.statementLineId, params.statementLineId),
        eq(treasuryReconciliationMatch.status, "matched"),
      ),
    );

  if (existingMatch) {
    return {
      ok: false,
      error: {
        code: "TREAS_RECONCILIATION_LINE_ALREADY_MATCHED",
        message: "Statement line already has an active match",
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.reconciliation-session.match-added" as const,
    entityType: "reconciliation_session" as const,
    entityId: params.sessionId as unknown as EntityId,
    correlationId,
    details: {
      statementLineId: params.statementLineId,
      targetId: params.targetId,
      matchedAmountMinor: params.matchedAmountMinor,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    // Mark session as "matching"
    await tx
      .update(treasuryReconciliationSession)
      .set({ status: "matching", updatedAt: sql`now()` })
      .where(
        and(
          eq(treasuryReconciliationSession.orgId, orgId),
          eq(treasuryReconciliationSession.id, params.sessionId),
          eq(treasuryReconciliationSession.status, "open"),
        ),
      );

    const [row] = await tx
      .insert(treasuryReconciliationMatch)
      .values({
        orgId,
        reconciliationSessionId: params.sessionId,
        statementLineId: params.statementLineId,
        targetType: params.targetType,
        targetId: params.targetId,
        matchedAmountMinor: params.matchedAmountMinor,
        status: "matched",
      })
      .returning({ id: treasuryReconciliationMatch.id });

    if (!row) throw new Error("Failed to add reconciliation match");

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.RECONCILIATION_MATCH_ADDED",
      version: "1",
      correlationId,
      payload: {
        reconciliationSessionId: params.sessionId,
        matchId: row.id,
        statementLineId: params.statementLineId,
        targetId: params.targetId,
      },
    });

    return { id: row.id as ReconciliationMatchId };
  });

  return { ok: true, data: result };
}

export async function removeReconciliationMatch(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: RemoveReconciliationMatchParams,
): Promise<ReconciliationSessionServiceResult<{ id: ReconciliationMatchId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [session] = await db
    .select({ id: treasuryReconciliationSession.id, status: treasuryReconciliationSession.status })
    .from(treasuryReconciliationSession)
    .where(
      and(
        eq(treasuryReconciliationSession.orgId, orgId),
        eq(treasuryReconciliationSession.id, params.sessionId),
      ),
    );

  if (!session) {
    return {
      ok: false,
      error: { code: "TREAS_RECONCILIATION_SESSION_NOT_FOUND", message: "Reconciliation session not found" },
    };
  }

  if (session.status === "closed") {
    return {
      ok: false,
      error: { code: "TREAS_RECONCILIATION_SESSION_CLOSED", message: "Cannot remove match from a closed session" },
    };
  }

  const [match] = await db
    .select({ id: treasuryReconciliationMatch.id, status: treasuryReconciliationMatch.status })
    .from(treasuryReconciliationMatch)
    .where(
      and(
        eq(treasuryReconciliationMatch.orgId, orgId),
        eq(treasuryReconciliationMatch.reconciliationSessionId, params.sessionId),
        eq(treasuryReconciliationMatch.id, params.matchId),
      ),
    );

  if (!match) {
    return {
      ok: false,
      error: { code: "TREAS_RECONCILIATION_MATCH_NOT_FOUND", message: "Reconciliation match not found" },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.reconciliation-session.match-removed" as const,
    entityType: "reconciliation_session" as const,
    entityId: params.sessionId as unknown as EntityId,
    correlationId,
    details: { matchId: params.matchId },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    await tx
      .update(treasuryReconciliationMatch)
      .set({ status: "unmatched", unmatchedAt: sql`now()` })
      .where(
        and(
          eq(treasuryReconciliationMatch.orgId, orgId),
          eq(treasuryReconciliationMatch.id, params.matchId),
        ),
      );

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.RECONCILIATION_MATCH_REMOVED",
      version: "1",
      correlationId,
      payload: {
        reconciliationSessionId: params.sessionId,
        matchId: params.matchId,
      },
    });

    return { id: params.matchId };
  });

  return { ok: true, data: result };
}

export async function closeReconciliationSession(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CloseReconciliationSessionParams,
): Promise<ReconciliationSessionServiceResult<{ id: ReconciliationSessionId }>> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [session] = await db
    .select({ id: treasuryReconciliationSession.id, status: treasuryReconciliationSession.status })
    .from(treasuryReconciliationSession)
    .where(
      and(
        eq(treasuryReconciliationSession.orgId, orgId),
        eq(treasuryReconciliationSession.id, params.sessionId),
      ),
    );

  if (!session) {
    return {
      ok: false,
      error: { code: "TREAS_RECONCILIATION_SESSION_NOT_FOUND", message: "Reconciliation session not found" },
    };
  }

  if (session.status === "closed") {
    return {
      ok: false,
      error: { code: "TREAS_RECONCILIATION_SESSION_CLOSED", message: "Session is already closed" },
    };
  }

  if (session.status === "voided") {
    return {
      ok: false,
      error: { code: "TREAS_RECONCILIATION_SESSION_VOIDED", message: "Session is voided" },
    };
  }

  const auditEntry = {
    actorPrincipalId: policyCtx.principalId,
    action: "treasury.reconciliation-session.closed" as const,
    entityType: "reconciliation_session" as const,
    entityId: params.sessionId as unknown as EntityId,
    correlationId,
    details: {},
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    await tx
      .update(treasuryReconciliationSession)
      .set({ status: "closed", closedAt: sql`now()`, updatedAt: sql`now()` })
      .where(
        and(
          eq(treasuryReconciliationSession.orgId, orgId),
          eq(treasuryReconciliationSession.id, params.sessionId),
        ),
      );

    await tx.insert(outboxEvent).values({
      orgId,
      type: "TREAS.RECONCILIATION_SESSION_CLOSED",
      version: "1",
      correlationId,
      payload: { reconciliationSessionId: params.sessionId },
    });

    return { id: params.sessionId };
  });

  return { ok: true, data: result };
}
