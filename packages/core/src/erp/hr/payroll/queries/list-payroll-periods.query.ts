import type { DbClient } from "@afenda/db";
import { hrmPayrollPeriods } from "@afenda/db";
import { and, desc, eq, sql } from "drizzle-orm";

export interface ListPayrollPeriodsParams {
  orgId: string;
  status?: "open" | "locked" | "closed";
  limit?: number;
  offset?: number;
}

export interface PayrollPeriodItem {
  payrollPeriodId: string;
  periodCode: string;
  periodStartDate: string;
  periodEndDate: string;
  paymentDate: string;
  periodStatus: string;
}

export interface ListPayrollPeriodsResult {
  items: PayrollPeriodItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listPayrollPeriods(
  db: DbClient,
  params: ListPayrollPeriodsParams,
): Promise<ListPayrollPeriodsResult> {
  const limit = Math.min(params.limit ?? 25, 100);
  const offset = Math.max(params.offset ?? 0, 0);

  const whereConditions = [eq(hrmPayrollPeriods.orgId, params.orgId)];
  if (params.status) {
    whereConditions.push(eq(hrmPayrollPeriods.periodStatus, params.status));
  }

  const countRows = await db
    .select({ total: sql`count(*)` })
    .from(hrmPayrollPeriods)
    .where(and(...whereConditions));

  const rows = await db
    .select({
      payrollPeriodId: hrmPayrollPeriods.id,
      periodCode: hrmPayrollPeriods.periodCode,
      periodStartDate: hrmPayrollPeriods.periodStartDate,
      periodEndDate: hrmPayrollPeriods.periodEndDate,
      paymentDate: hrmPayrollPeriods.paymentDate,
      periodStatus: hrmPayrollPeriods.periodStatus,
    })
    .from(hrmPayrollPeriods)
    .where(and(...whereConditions))
    .orderBy(desc(hrmPayrollPeriods.periodStartDate))
    .limit(limit)
    .offset(offset);

  const items: PayrollPeriodItem[] = rows.map((r) => ({
    payrollPeriodId: r.payrollPeriodId,
    periodCode: r.periodCode,
    periodStartDate: String(r.periodStartDate),
    periodEndDate: String(r.periodEndDate),
    paymentDate: String(r.paymentDate),
    periodStatus: r.periodStatus,
  }));

  return {
    items,
    total: Number(countRows[0]?.total ?? 0),
    limit,
    offset,
  };
}
