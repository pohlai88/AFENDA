import type { DbClient } from "@afenda/db";
import { treasuryReconciliationSession, treasuryReconciliationMatch } from "@afenda/db";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX, type OrgId } from "@afenda/contracts";

export interface ReconciliationSessionRow {
  id: string;
  orgId: string;
  bankAccountId: string;
  bankStatementId: string;
  status: string;
  toleranceMinor: string;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReconciliationMatchRow {
  id: string;
  orgId: string;
  reconciliationSessionId: string;
  statementLineId: string;
  targetType: string;
  targetId: string;
  matchedAmountMinor: string;
  status: string;
  matchedAt: Date;
  unmatchedAt: Date | null;
  createdAt: Date;
}

export interface ReconciliationSessionListParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

export async function listReconciliationSessions(
  db: DbClient,
  orgId: OrgId,
  params: ReconciliationSessionListParams = {},
): Promise<{ data: ReconciliationSessionRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(treasuryReconciliationSession.orgId, orgId)];

  if (params.status) {
    conditions.push(eq(treasuryReconciliationSession.status, params.status as "open" | "matching" | "closed" | "voided"));
  }

  if (params.cursor) {
    conditions.push(gt(treasuryReconciliationSession.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(treasuryReconciliationSession)
    .where(and(...conditions))
    .orderBy(asc(treasuryReconciliationSession.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map((r) => ({ ...r })),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getReconciliationSessionById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<ReconciliationSessionRow | null> {
  const [row] = await db
    .select()
    .from(treasuryReconciliationSession)
    .where(and(eq(treasuryReconciliationSession.orgId, orgId), eq(treasuryReconciliationSession.id, id)));

  return row ?? null;
}

export async function listReconciliationMatches(
  db: DbClient,
  orgId: OrgId,
  sessionId: string,
): Promise<ReconciliationMatchRow[]> {
  const rows = await db
    .select()
    .from(treasuryReconciliationMatch)
    .where(
      and(
        eq(treasuryReconciliationMatch.orgId, orgId),
        eq(treasuryReconciliationMatch.reconciliationSessionId, sessionId),
      ),
    )
    .orderBy(desc(treasuryReconciliationMatch.matchedAt));

  return rows.map((r) => ({ ...r }));
}
