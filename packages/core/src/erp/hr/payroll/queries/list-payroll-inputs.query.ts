import type { DbClient } from "@afenda/db";
import { hrmPayrollInputs } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface ListPayrollInputsParams {
  orgId: string;
  payrollRunId: string;
  employmentId?: string;
}

export interface PayrollInputItem {
  payrollInputId: string;
  payrollRunId: string;
  employmentId: string;
  inputType: string;
  inputCode: string;
  sourceModule: string;
  sourceReferenceId: string | null;
  quantity: string | null;
  rate: string | null;
  amount: string | null;
  currencyCode: string | null;
  effectiveDate: string | null;
  status: string;
}

export async function listPayrollInputs(
  db: DbClient,
  params: ListPayrollInputsParams,
): Promise<PayrollInputItem[]> {
  const whereConditions = [
    eq(hrmPayrollInputs.orgId, params.orgId),
    eq(hrmPayrollInputs.payrollRunId, params.payrollRunId),
  ];
  if (params.employmentId) {
    whereConditions.push(eq(hrmPayrollInputs.employmentId, params.employmentId));
  }

  const rows = await db
    .select({
      payrollInputId: hrmPayrollInputs.id,
      payrollRunId: hrmPayrollInputs.payrollRunId,
      employmentId: hrmPayrollInputs.employmentId,
      inputType: hrmPayrollInputs.inputType,
      inputCode: hrmPayrollInputs.inputCode,
      sourceModule: hrmPayrollInputs.sourceModule,
      sourceReferenceId: hrmPayrollInputs.sourceReferenceId,
      quantity: hrmPayrollInputs.quantity,
      rate: hrmPayrollInputs.rate,
      amount: hrmPayrollInputs.amount,
      currencyCode: hrmPayrollInputs.currencyCode,
      effectiveDate: hrmPayrollInputs.effectiveDate,
      status: hrmPayrollInputs.status,
    })
    .from(hrmPayrollInputs)
    .where(and(...whereConditions));

  return rows.map((r) => ({
    payrollInputId: r.payrollInputId,
    payrollRunId: r.payrollRunId,
    employmentId: r.employmentId,
    inputType: r.inputType,
    inputCode: r.inputCode,
    sourceModule: r.sourceModule,
    sourceReferenceId: r.sourceReferenceId,
    quantity: r.quantity != null ? String(r.quantity) : null,
    rate: r.rate != null ? String(r.rate) : null,
    amount: r.amount != null ? String(r.amount) : null,
    currencyCode: r.currencyCode,
    effectiveDate: r.effectiveDate != null ? String(r.effectiveDate) : null,
    status: r.status,
  }));
}
