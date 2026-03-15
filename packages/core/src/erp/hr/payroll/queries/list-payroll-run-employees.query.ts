import type { DbClient } from "@afenda/db";
import { hrmPayrollRunEmployees } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface ListPayrollRunEmployeesParams {
  orgId: string;
  payrollRunId: string;
}

export interface PayrollRunEmployeeItem {
  payrollRunEmployeeId: string;
  payrollRunId: string;
  employmentId: string;
  currencyCode: string;
  grossAmount: string;
  deductionAmount: string;
  employerCostAmount: string;
  netAmount: string;
  status: string;
}

export async function listPayrollRunEmployees(
  db: DbClient,
  params: ListPayrollRunEmployeesParams,
): Promise<PayrollRunEmployeeItem[]> {
  const rows = await db
    .select({
      payrollRunEmployeeId: hrmPayrollRunEmployees.id,
      payrollRunId: hrmPayrollRunEmployees.payrollRunId,
      employmentId: hrmPayrollRunEmployees.employmentId,
      currencyCode: hrmPayrollRunEmployees.currencyCode,
      grossAmount: hrmPayrollRunEmployees.grossAmount,
      deductionAmount: hrmPayrollRunEmployees.deductionAmount,
      employerCostAmount: hrmPayrollRunEmployees.employerCostAmount,
      netAmount: hrmPayrollRunEmployees.netAmount,
      status: hrmPayrollRunEmployees.status,
    })
    .from(hrmPayrollRunEmployees)
    .where(
      and(
        eq(hrmPayrollRunEmployees.orgId, params.orgId),
        eq(hrmPayrollRunEmployees.payrollRunId, params.payrollRunId),
      ),
    );

  return rows.map((r) => ({
    payrollRunEmployeeId: r.payrollRunEmployeeId,
    payrollRunId: r.payrollRunId,
    employmentId: r.employmentId,
    currencyCode: r.currencyCode,
    grossAmount: String(r.grossAmount),
    deductionAmount: String(r.deductionAmount),
    employerCostAmount: String(r.employerCostAmount),
    netAmount: String(r.netAmount),
    status: r.status,
  }));
}
