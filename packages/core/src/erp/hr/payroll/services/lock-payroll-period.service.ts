import type { DbClient } from "@afenda/db";
import { auditLog, hrmPayrollPeriods, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface LockPayrollPeriodInput {
  payrollPeriodId: string;
}

export interface LockPayrollPeriodOutput {
  payrollPeriodId: string;
  periodStatus: string;
}

export async function lockPayrollPeriod(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: LockPayrollPeriodInput,
): Promise<HrmResult<LockPayrollPeriodOutput>> {
  if (!input.payrollPeriodId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "payrollPeriodId is required");
  }

  try {
    const [period] = await db
      .select({
        id: hrmPayrollPeriods.id,
        periodStatus: hrmPayrollPeriods.periodStatus,
      })
      .from(hrmPayrollPeriods)
      .where(
        and(
          eq(hrmPayrollPeriods.orgId, orgId),
          eq(hrmPayrollPeriods.id, input.payrollPeriodId),
        ),
      );

    if (!period) {
      return err(HRM_ERROR_CODES.PAYROLL_PERIOD_NOT_FOUND, "Payroll period not found", {
        payrollPeriodId: input.payrollPeriodId,
      });
    }

    if (period.periodStatus !== "open") {
      return err(HRM_ERROR_CODES.CONFLICT, "Period is not open for locking", {
        payrollPeriodId: input.payrollPeriodId,
        currentStatus: period.periodStatus,
      });
    }

    await db
      .update(hrmPayrollPeriods)
      .set({
        periodStatus: "locked",
        lockedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hrmPayrollPeriods.orgId, orgId),
          eq(hrmPayrollPeriods.id, input.payrollPeriodId),
        ),
      );

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.PAYROLL_PERIOD_LOCKED,
      entityType: "hrm_payroll_period",
      entityId: input.payrollPeriodId,
      correlationId,
      details: {
        payrollPeriodId: input.payrollPeriodId,
        previousStatus: period.periodStatus,
        newStatus: "locked",
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.PAYROLL_PERIOD_LOCKED",
      version: "1",
      correlationId,
      payload: {
        payrollPeriodId: input.payrollPeriodId,
        periodStatus: "locked",
      },
    });

    return ok({
      payrollPeriodId: input.payrollPeriodId,
      periodStatus: "locked",
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to lock payroll period", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
