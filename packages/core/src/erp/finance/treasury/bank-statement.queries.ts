import type { DbClient } from "@afenda/db";
import { bankStatement, bankStatementLine } from "@afenda/db";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX, type OrgId, BankStatementStatusValues } from "@afenda/contracts";

export interface BankStatementRow {
  id: string;
  orgId: string;
  bankAccountId: string;
  sourceRef: string;
  statementDate: Date;
  openingBalance: bigint;
  closingBalance: bigint;
  currencyCode: string;
  status: string;
  lineCount: number;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankStatementLineRow {
  id: string;
  orgId: string;
  statementId: string;
  lineNumber: number;
  transactionDate: Date;
  valueDate: Date | null;
  description: string;
  reference: string | null;
  amount: bigint;
  direction: string;
  status: string;
  createdAt: Date;
}

export interface BankStatementListParams {
  cursor?: string;
  limit?: number;
  status?: string;
  bankAccountId?: string;
}

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

export async function listBankStatements(
  db: DbClient,
  orgId: OrgId,
  params: BankStatementListParams = {},
): Promise<{ data: BankStatementRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(bankStatement.orgId, orgId)];

  if (
    params.status &&
    BankStatementStatusValues.includes(
      params.status as (typeof BankStatementStatusValues)[number],
    )
  ) {
    conditions.push(
      eq(bankStatement.status, params.status as (typeof BankStatementStatusValues)[number]),
    );
  }

  if (params.bankAccountId) {
    conditions.push(eq(bankStatement.bankAccountId, params.bankAccountId));
  }

  if (params.cursor) {
    conditions.push(gt(bankStatement.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(bankStatement)
    .where(and(...conditions))
    .orderBy(asc(bankStatement.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map((row) => ({ ...row })),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getBankStatementById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<BankStatementRow | null> {
  const [row] = await db
    .select()
    .from(bankStatement)
    .where(and(eq(bankStatement.orgId, orgId), eq(bankStatement.id, id)));

  return row ?? null;
}

export async function listBankStatementLines(
  db: DbClient,
  orgId: OrgId,
  statementId: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<{ data: BankStatementLineRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [
    eq(bankStatementLine.orgId, orgId),
    eq(bankStatementLine.statementId, statementId),
  ];

  if (params.cursor) {
    conditions.push(gt(bankStatementLine.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(bankStatementLine)
    .where(and(...conditions))
    .orderBy(asc(bankStatementLine.lineNumber), asc(bankStatementLine.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map((row) => ({ ...row })),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}
