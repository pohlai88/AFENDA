import type { DbClient } from "@afenda/db";
import { auditLog, hrmPayrollPeriods, hrmPayrollRuns, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreatePayrollRunInput {
  payrollPeriodId: string;
  runNumber?: string;
  runType?: "regular" | "off_cycle";
}

export interface CreatePayrollRunOutput {
  payrollRunId: string;
  runNumber: string;
  status: string;
}

export async function createPayrollRun(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreatePayrollRunInput,
): Promise<HrmResult<CreatePayrollRunOutput>> {
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

    if (period.periodStatus !== "open" && period.periodStatus !== "locked") {
      return err(HRM_ERROR_CODES.CONFLICT, "Period is not open for payroll run", {
        payrollPeriodId: input.payrollPeriodId,
        periodStatus: period.periodStatus,
      });
    }

    const runNumber =
      input.runNumber ??
      `RUN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8)}`;

    const [existing] = await db
      .select({ id: hrmPayrollRuns.id })
      .from(hrmPayrollRuns)
      .where(
        and(
          eq(hrmPayrollRuns.orgId, orgId),
          eq(hrmPayrollRuns.payrollPeriodId, input.payrollPeriodId),
          eq(hrmPayrollRuns.runNumber, runNumber),
        ),
      );

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Payroll run with this number already exists", {
        runNumber,
      });
    }

    const [row] = await db
      .insert(hrmPayrollRuns)
      .values({
        orgId,
        payrollPeriodId: input.payrollPeriodId,
        runType: input.runType ?? "regular",
        runNumber,
        status: "draft",
      })
      .returning({
        id: hrmPayrollRuns.id,
        runNumber: hrmPayrollRuns.runNumber,
        status: hrmPayrollRuns.status,
      });

    if (!row) {
      throw new Error("Failed to create payroll run");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.PAYROLL_RUN_CREATED,
      entityType: "hrm_payroll_run",
      entityId: row.id,
      correlationId,
      details: {
        payrollRunId: row.id,
        payrollPeriodId: input.payrollPeriodId,
        runNumber: row.runNumber,
        status: row.status,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.PAYROLL_RUN_CREATED",
      version: "1",
      correlationId,
      payload: {
        payrollRunId: row.id,
        payrollPeriodId: input.payrollPeriodId,
        runNumber: row.runNumber,
        status: row.status,
      },
    });

    return ok({
      payrollRunId: row.id,
      runNumber: row.runNumber,
      status: row.status,
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create payroll run", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
