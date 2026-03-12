import type { DbClient } from "@afenda/db";
import { bankAccount } from "@afenda/db";
import { and, asc, eq, gt } from "drizzle-orm";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX, type OrgId, BankAccountStatusValues } from "@afenda/contracts";

export interface BankAccountRow {
  id: string;
  orgId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  currencyCode: string;
  bankIdentifierCode: string | null;
  externalBankRef: string | null;
  status: string;
  isPrimary: boolean;
  activatedAt: Date | null;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccountListParams {
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

export async function listBankAccounts(
  db: DbClient,
  orgId: OrgId,
  params: BankAccountListParams = {},
): Promise<{ data: BankAccountRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(bankAccount.orgId, orgId)];

  if (
    params.status &&
    BankAccountStatusValues.includes(params.status as (typeof BankAccountStatusValues)[number])
  ) {
    conditions.push(eq(bankAccount.status, params.status as (typeof BankAccountStatusValues)[number]));
  }

  if (params.cursor) {
    conditions.push(gt(bankAccount.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(bankAccount)
    .where(and(...conditions))
    .orderBy(asc(bankAccount.id))
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

export async function getBankAccountById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<BankAccountRow | null> {
  const [row] = await db
    .select()
    .from(bankAccount)
    .where(and(eq(bankAccount.orgId, orgId), eq(bankAccount.id, id)))
    .limit(1);

  return row ? { ...row } : null;
}
