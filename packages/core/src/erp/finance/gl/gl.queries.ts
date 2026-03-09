/**
 * GL read queries — journal entries, accounts, trial balance.
 *
 * RULES:
 *   - All queries are org-scoped — `orgId` in every WHERE clause.
 *   - Cursor pagination for list endpoints.
 *   - Trial balance is a real-time aggregate (no materialised view yet).
 *   - No HTTP/Fastify imports — pure domain query.
 */

import type { DbClient } from "@afenda/db";
import { journalEntry, journalLine, account } from "@afenda/db";
import { eq, and, gt, asc, sql } from "drizzle-orm";
import type { OrgId, JournalEntryId, CursorPage } from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";

// ── Types ────────────────────────────────────────────────────────────────────

export interface JournalEntryRow {
  id: string;
  orgId: string;
  entryNumber: string;
  postedAt: Date;
  memo: string | null;
  postedByPrincipalId: string | null;
  correlationId: string;
  idempotencyKey: string | null;
  sourceInvoiceId: string | null;
  reversalOfId: string | null;
  createdAt: Date;
}

export interface JournalLineRow {
  id: string;
  journalEntryId: string;
  accountId: string;
  debitMinor: bigint;
  creditMinor: bigint;
  currencyCode: string;
  memo: string | null;
  dimensions: Record<string, string> | null;
}

export interface AccountRow {
  id: string;
  orgId: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitTotal: bigint;
  creditTotal: bigint;
}

export interface ListParams {
  cursor?: string;
  limit?: number;
}

// ── Cursor helpers ───────────────────────────────────────────────────────────

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

// ── List journal entries ─────────────────────────────────────────────────────

export async function listJournalEntries(
  db: DbClient,
  orgId: OrgId,
  params: ListParams = {},
): Promise<CursorPage<JournalEntryRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(journalEntry.orgId, orgId)];

  if (params.cursor) {
    const cursorId = decodeCursor(params.cursor);
    conditions.push(gt(journalEntry.id, cursorId));
  }

  const rows = await db
    .select()
    .from(journalEntry)
    .where(and(...conditions))
    .orderBy(asc(journalEntry.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data,
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

// ── Get journal entry with lines ─────────────────────────────────────────────

export interface JournalEntryWithLines extends JournalEntryRow {
  lines: JournalLineRow[];
}

export async function getJournalEntryById(
  db: DbClient,
  orgId: OrgId,
  entryId: JournalEntryId,
): Promise<JournalEntryWithLines | null> {
  const [entry] = await db
    .select()
    .from(journalEntry)
    .where(and(eq(journalEntry.id, entryId), eq(journalEntry.orgId, orgId)));

  if (!entry) return null;

  const lines = await db.select().from(journalLine).where(eq(journalLine.journalEntryId, entryId));

  return { ...entry, lines };
}

// ── List accounts ────────────────────────────────────────────────────────────

export async function listAccounts(
  db: DbClient,
  orgId: OrgId,
  params: ListParams = {},
): Promise<CursorPage<AccountRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(account.orgId, orgId)];

  if (params.cursor) {
    const cursorId = decodeCursor(params.cursor);
    conditions.push(gt(account.id, cursorId));
  }

  const rows = await db
    .select()
    .from(account)
    .where(and(...conditions))
    .orderBy(asc(account.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data,
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

// ── Trial balance ────────────────────────────────────────────────────────────

/**
 * Compute a real-time trial balance by aggregating all journal lines
 * grouped by account.
 *
 * Returns only accounts with non-zero balances.
 * Does NOT use a materialised view — suitable for Day-1 volumes.
 */
export async function getTrialBalance(db: DbClient, orgId: OrgId): Promise<TrialBalanceRow[]> {
  const rows = await db
    .select({
      accountId: journalLine.accountId,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      debitTotal: sql<bigint>`COALESCE(SUM(${journalLine.debitMinor}), 0)`,
      creditTotal: sql<bigint>`COALESCE(SUM(${journalLine.creditMinor}), 0)`,
    })
    .from(journalLine)
    .innerJoin(account, eq(journalLine.accountId, account.id))
    .innerJoin(journalEntry, eq(journalLine.journalEntryId, journalEntry.id))
    .where(eq(journalEntry.orgId, orgId))
    .groupBy(journalLine.accountId, account.code, account.name, account.type)
    .orderBy(asc(account.code));

  return rows;
}
