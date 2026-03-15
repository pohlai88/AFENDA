import type { DbClient } from "@afenda/db";
import { hrmPayrollPeriods, hrmPayrollRuns } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface GetPayrollRunParams {
  orgId: string;
  payrollRunId: string;
}

export interface PayrollRunView {
  payrollRunId: string;
  payrollPeriodId: string;
  periodCode: string;
  periodStartDate: string;
  periodEndDate: string;
  paymentDate: string;
  runType: string;
  runNumber: string;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
}

export async function getPayrollRun(
  db: DbClient,
  params: GetPayrollRunParams,
): Promise<PayrollRunView | null> {
  const rows = await db
    .select({
      payrollRunId: hrmPayrollRuns.id,
      payrollPeriodId: hrmPayrollRuns.payrollPeriodId,
      periodCode: hrmPayrollPeriods.periodCode,
      periodStartDate: hrmPayrollPeriods.periodStartDate,
      periodEndDate: hrmPayrollPeriods.periodEndDate,
      paymentDate: hrmPayrollPeriods.paymentDate,
      runType: hrmPayrollRuns.runType,
      runNumber: hrmPayrollRuns.runNumber,
      status: hrmPayrollRuns.status,
      submittedAt: hrmPayrollRuns.submittedAt,
      approvedAt: hrmPayrollRuns.approvedAt,
    })
    .from(hrmPayrollRuns)
    .innerJoin(
      hrmPayrollPeriods,
      eq(hrmPayrollRuns.payrollPeriodId, hrmPayrollPeriods.id),
    )
    .where(
      and(
        eq(hrmPayrollRuns.orgId, params.orgId),
        eq(hrmPayrollRuns.id, params.payrollRunId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    payrollRunId: row.payrollRunId,
    payrollPeriodId: row.payrollPeriodId,
    periodCode: row.periodCode,
    periodStartDate: String(row.periodStartDate),
    periodEndDate: String(row.periodEndDate),
    paymentDate: String(row.paymentDate),
    runType: row.runType,
    runNumber: row.runNumber,
    status: row.status,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
  };
}
