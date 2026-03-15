import type { DbClient } from "@afenda/db";
import { auditLog, hrmPayslips, hrmPayrollRunEmployees, hrmPayrollRuns, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface PublishPayslipsInput {
  payrollRunId: string;
}

export interface PublishPayslipsOutput {
  payrollRunId: string;
  payslipsPublished: number;
}

export async function publishPayslips(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: PublishPayslipsInput,
): Promise<HrmResult<PublishPayslipsOutput>> {
  if (!input.payrollRunId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "payrollRunId is required");
  }

  try {
    const [run] = await db
      .select({
        id: hrmPayrollRuns.id,
        status: hrmPayrollRuns.status,
        runNumber: hrmPayrollRuns.runNumber,
      })
      .from(hrmPayrollRuns)
      .where(
        and(
          eq(hrmPayrollRuns.orgId, orgId),
          eq(hrmPayrollRuns.id, input.payrollRunId),
        ),
      );

    if (!run) {
      return err(HRM_ERROR_CODES.PAYROLL_RUN_NOT_FOUND, "Payroll run not found", {
        payrollRunId: input.payrollRunId,
      });
    }

    if (run.status !== "approved") {
      return err(HRM_ERROR_CODES.CONFLICT, "Payroll run must be approved before publishing payslips", {
        payrollRunId: input.payrollRunId,
        currentStatus: run.status,
      });
    }

    const existingPayslips = await db
      .select({ id: hrmPayslips.id })
      .from(hrmPayslips)
      .innerJoin(
        hrmPayrollRunEmployees,
        eq(hrmPayslips.payrollRunEmployeeId, hrmPayrollRunEmployees.id),
      )
      .where(
        and(
          eq(hrmPayrollRunEmployees.orgId, orgId),
          eq(hrmPayrollRunEmployees.payrollRunId, input.payrollRunId),
        ),
      );

    if (existingPayslips.length > 0) {
      return err(HRM_ERROR_CODES.PAYSLIPS_ALREADY_PUBLISHED, "Payslips already published for this run", {
        payrollRunId: input.payrollRunId,
      });
    }

    const runEmployees = await db
      .select({
        id: hrmPayrollRunEmployees.id,
      })
      .from(hrmPayrollRunEmployees)
      .where(
        and(
          eq(hrmPayrollRunEmployees.orgId, orgId),
          eq(hrmPayrollRunEmployees.payrollRunId, input.payrollRunId),
        ),
      );

    if (runEmployees.length === 0) {
      return ok({
        payrollRunId: input.payrollRunId,
        payslipsPublished: 0,
      });
    }

    const now = sql`now()`;
    for (let i = 0; i < runEmployees.length; i++) {
      const re = runEmployees[i];
      if (!re) continue;
      const payslipNumber = `PS-${run.runNumber}-${String(i + 1).padStart(4, "0")}`;
      await db.insert(hrmPayslips).values({
        orgId,
        payrollRunEmployeeId: re.id,
        payslipNumber,
        publishedAt: now,
        accessStatus: "published",
      });
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.PAYSLIPS_PUBLISHED,
      entityType: "hrm_payroll_run",
      entityId: input.payrollRunId,
      correlationId,
      details: {
        payrollRunId: input.payrollRunId,
        payslipsPublished: runEmployees.length,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.PAYSLIPS_PUBLISHED",
      version: "1",
      correlationId,
      payload: {
        payrollRunId: input.payrollRunId,
        payslipsPublished: runEmployees.length,
      },
    });

    return ok({
      payrollRunId: input.payrollRunId,
      payslipsPublished: runEmployees.length,
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to publish payslips", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
