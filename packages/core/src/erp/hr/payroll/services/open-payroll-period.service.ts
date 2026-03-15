import type { DbClient } from "@afenda/db";
import { auditLog, hrmPayrollPeriods, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface OpenPayrollPeriodInput {
  periodCode: string;
  periodStartDate: string;
  periodEndDate: string;
  paymentDate: string;
}

export interface OpenPayrollPeriodOutput {
  payrollPeriodId: string;
  periodCode: string;
  periodStatus: string;
}

export async function openPayrollPeriod(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: OpenPayrollPeriodInput,
): Promise<HrmResult<OpenPayrollPeriodOutput>> {
  if (
    !input.periodCode ||
    !input.periodStartDate ||
    !input.periodEndDate ||
    !input.paymentDate
  ) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "periodCode, periodStartDate, periodEndDate and paymentDate are required",
    );
  }

  if (input.periodStartDate > input.periodEndDate) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "periodStartDate must be <= periodEndDate");
  }

  try {
    const [existing] = await db
      .select({ id: hrmPayrollPeriods.id })
      .from(hrmPayrollPeriods)
      .where(and(eq(hrmPayrollPeriods.orgId, orgId), eq(hrmPayrollPeriods.periodCode, input.periodCode)));

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Period with this code already exists", {
        periodCode: input.periodCode,
      });
    }

    const [row] = await db
      .insert(hrmPayrollPeriods)
      .values({
        orgId,
        periodCode: input.periodCode,
        periodStartDate: sql`${input.periodStartDate}::date`,
        periodEndDate: sql`${input.periodEndDate}::date`,
        paymentDate: sql`${input.paymentDate}::date`,
        periodStatus: "open",
      })
      .returning({ id: hrmPayrollPeriods.id, periodCode: hrmPayrollPeriods.periodCode, periodStatus: hrmPayrollPeriods.periodStatus });

    if (!row) {
      throw new Error("Failed to create payroll period");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.PAYROLL_PERIOD_OPENED,
      entityType: "hrm_payroll_period",
      entityId: row.id,
      correlationId,
      details: {
        payrollPeriodId: row.id,
        periodCode: row.periodCode,
        periodStatus: row.periodStatus,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.PAYROLL_PERIOD_OPENED",
      version: "1",
      correlationId,
      payload: {
        payrollPeriodId: row.id,
        periodCode: row.periodCode,
        periodStatus: row.periodStatus,
      },
    });

    return ok({
      payrollPeriodId: row.id,
      periodCode: row.periodCode,
      periodStatus: row.periodStatus,
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to open payroll period", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
