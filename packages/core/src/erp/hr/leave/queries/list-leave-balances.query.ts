import type { DbClient } from "@afenda/db";
import { hrmLeaveBalances } from "@afenda/db";
import { and, desc, eq, sql } from "drizzle-orm";

export interface LeaveBalanceListItem {
  leaveBalanceId: string;
  employmentId: string;
  leaveTypeId: string;
  accrualPeriod: string;
  openingBalance: string;
  accruedAmount: string;
  consumedAmount: string;
  closingBalance: string;
}

export interface ListLeaveBalancesInput {
  orgId: string;
  employmentId?: string;
  leaveTypeId?: string;
  accrualPeriod?: string;
  limit?: number;
  offset?: number;
}

export interface ListLeaveBalancesResult {
  items: LeaveBalanceListItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listLeaveBalances(
  db: DbClient,
  input: ListLeaveBalancesInput,
): Promise<ListLeaveBalancesResult> {
  const limit = Math.min(input.limit ?? 25, 100);
  const offset = Math.max(input.offset ?? 0, 0);

  const filters = [eq(hrmLeaveBalances.orgId, input.orgId)];

  if (input.employmentId) {
    filters.push(eq(hrmLeaveBalances.employmentId, input.employmentId));
  }

  if (input.leaveTypeId) {
    filters.push(eq(hrmLeaveBalances.leaveTypeId, input.leaveTypeId));
  }

  if (input.accrualPeriod) {
    filters.push(eq(hrmLeaveBalances.accrualPeriod, input.accrualPeriod));
  }

  const rows = await db
    .select({
      leaveBalanceId: hrmLeaveBalances.id,
      employmentId: hrmLeaveBalances.employmentId,
      leaveTypeId: hrmLeaveBalances.leaveTypeId,
      accrualPeriod: hrmLeaveBalances.accrualPeriod,
      openingBalance: hrmLeaveBalances.openingBalance,
      accruedAmount: hrmLeaveBalances.accruedAmount,
      consumedAmount: hrmLeaveBalances.consumedAmount,
      closingBalance: hrmLeaveBalances.closingBalance,
    })
    .from(hrmLeaveBalances)
    .where(and(...filters))
    .orderBy(desc(hrmLeaveBalances.accrualPeriod), desc(hrmLeaveBalances.createdAt))
    .limit(limit)
    .offset(offset);

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(hrmLeaveBalances)
    .where(and(...filters));

  return {
    items: rows.map((row) => ({
      leaveBalanceId: row.leaveBalanceId,
      employmentId: row.employmentId,
      leaveTypeId: row.leaveTypeId,
      accrualPeriod: row.accrualPeriod,
      openingBalance: String(row.openingBalance),
      accruedAmount: String(row.accruedAmount),
      consumedAmount: String(row.consumedAmount),
      closingBalance: String(row.closingBalance),
    })),
    total: Number(countRows[0]?.total ?? 0),
    limit,
    offset,
  };
}
