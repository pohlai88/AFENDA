/**
 * Build payroll-to-GL mapping — derive debit/credit lines from payroll result lines.
 *
 * Element categories:
 *   - earning: DR expense (glMappingCode)
 *   - deduction: CR payable (glMappingCode)
 *   - employer_cost: DR expense (glMappingCode)
 *   - tax: CR tax payable (glMappingCode)
 *
 * Net pay: CR payroll payable (payrollPayableAccountCode).
 *
 * Amounts are converted from numeric to bigint minor units (cents).
 */

import type { DbClient } from "@afenda/db";
import { account, hrmPayrollElements, hrmPayrollResultLines, hrmPayrollRunEmployees } from "@afenda/db";
import { and, eq, inArray } from "drizzle-orm";

export interface GlLineInput {
  accountId: string;
  debitMinor: bigint;
  creditMinor: bigint;
  currencyCode: string;
  memo?: string;
}

export interface BuildPayrollGlMappingInput {
  orgId: string;
  payrollRunId: string;
  payrollPayableAccountCode: string;
}

export interface BuildPayrollGlMappingOutput {
  lines: GlLineInput[];
  currencyCode: string;
}

/** Convert numeric string to bigint minor units (cents). */
function toMinorUnits(value: string): bigint {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return 0n;
  return BigInt(Math.round(num * 100));
}

export async function buildPayrollGlMapping(
  db: DbClient,
  input: BuildPayrollGlMappingInput,
): Promise<BuildPayrollGlMappingOutput | { error: string; code: string }> {
  const runEmployees = await db
    .select({
      id: hrmPayrollRunEmployees.id,
      netAmount: hrmPayrollRunEmployees.netAmount,
      currencyCode: hrmPayrollRunEmployees.currencyCode,
    })
    .from(hrmPayrollRunEmployees)
    .where(
      and(
        eq(hrmPayrollRunEmployees.orgId, input.orgId),
        eq(hrmPayrollRunEmployees.payrollRunId, input.payrollRunId),
      ),
    );

  if (runEmployees.length === 0) {
    return { error: "No run employees found", code: "HRM_PAYROLL_RUN_NOT_FOUND" };
  }

  const resultLines = await db
    .select({
      calculatedAmount: hrmPayrollResultLines.calculatedAmount,
      currencyCode: hrmPayrollResultLines.currencyCode,
      elementCategory: hrmPayrollElements.elementCategory,
      glMappingCode: hrmPayrollElements.glMappingCode,
    })
    .from(hrmPayrollResultLines)
    .innerJoin(
      hrmPayrollElements,
      eq(hrmPayrollResultLines.payrollElementId, hrmPayrollElements.id),
    )
    .innerJoin(
      hrmPayrollRunEmployees,
      eq(hrmPayrollResultLines.payrollRunEmployeeId, hrmPayrollRunEmployees.id),
    )
    .where(
      and(
        eq(hrmPayrollResultLines.orgId, input.orgId),
        eq(hrmPayrollRunEmployees.payrollRunId, input.payrollRunId),
      ),
    );

  const currencyCode = runEmployees[0]?.currencyCode ?? "USD";

  const aggregated = new Map<
    string,
    { debit: bigint; credit: bigint; currencyCode: string }
  >();

  for (const line of resultLines) {
    const amount = toMinorUnits(String(line.calculatedAmount ?? "0"));
    if (amount === 0n) continue;

    const glCode = line.glMappingCode?.trim();
    if (!glCode) {
      return {
        error: `Element category ${line.elementCategory} has no glMappingCode`,
        code: "HRM_PAYROLL_GL_MAPPING_INCOMPLETE",
      };
    }

    const key = glCode;
    const existing = aggregated.get(key) ?? {
      debit: 0n,
      credit: 0n,
      currencyCode: line.currencyCode ?? currencyCode,
    };

    switch (line.elementCategory) {
      case "earning":
      case "employer_cost":
        existing.debit += amount;
        break;
      case "deduction":
      case "tax":
        existing.credit += amount;
        break;
      default:
        return {
          error: `Unknown element category: ${line.elementCategory}`,
          code: "HRM_PAYROLL_GL_MAPPING_INCOMPLETE",
        };
    }
    aggregated.set(key, existing);
  }

  let netPayCredit = 0n;
  for (const re of runEmployees) {
    netPayCredit += toMinorUnits(String(re.netAmount ?? "0"));
  }

  const existing = aggregated.get(input.payrollPayableAccountCode) ?? {
    debit: 0n,
    credit: 0n,
    currencyCode,
  };
  existing.credit += netPayCredit;
  aggregated.set(input.payrollPayableAccountCode, existing);

  const codes = [...aggregated.keys()];
  const accounts = await db
    .select({ id: account.id, code: account.code })
    .from(account)
    .where(
      and(
        eq(account.orgId, input.orgId),
        inArray(account.code, codes),
      ),
    );

  const codeToId = new Map(accounts.map((a) => [a.code, a.id]));

  for (const code of codes) {
    if (!codeToId.has(code)) {
      return {
        error: `Account not found for code: ${code}`,
        code: "HRM_PAYROLL_GL_MAPPING_INCOMPLETE",
      };
    }
  }

  const lines: GlLineInput[] = [];
  for (const [code, agg] of aggregated) {
    const accountId = codeToId.get(code)!;
    const netDebit = agg.debit > agg.credit ? agg.debit - agg.credit : 0n;
    const netCredit = agg.credit > agg.debit ? agg.credit - agg.debit : 0n;
    if (netDebit > 0n) {
      lines.push({
        accountId,
        debitMinor: netDebit,
        creditMinor: 0n,
        currencyCode: agg.currencyCode,
        memo: `Payroll run ${input.payrollRunId}`,
      });
    }
    if (netCredit > 0n) {
      lines.push({
        accountId,
        debitMinor: 0n,
        creditMinor: netCredit,
        currencyCode: agg.currencyCode,
        memo: `Payroll run ${input.payrollRunId}`,
      });
    }
  }

  return { lines, currencyCode };
}
