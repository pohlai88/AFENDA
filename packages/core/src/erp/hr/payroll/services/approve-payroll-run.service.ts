import type { DbClient } from "@afenda/db";
import { auditLog, hrmPayrollRuns, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface ApprovePayrollRunInput {
  payrollRunId: string;
}

export interface ApprovePayrollRunOutput {
  payrollRunId: string;
  status: string;
}

export async function approvePayrollRun(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: ApprovePayrollRunInput,
): Promise<HrmResult<ApprovePayrollRunOutput>> {
  if (!input.payrollRunId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "payrollRunId is required");
  }

  try {
    const [run] = await db
      .select({
        id: hrmPayrollRuns.id,
        status: hrmPayrollRuns.status,
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

    if (run.status !== "submitted") {
      return err(HRM_ERROR_CODES.CONFLICT, "Payroll run must be submitted before approval", {
        payrollRunId: input.payrollRunId,
        currentStatus: run.status,
      });
    }

    await db
      .update(hrmPayrollRuns)
      .set({
        status: "approved",
        approvedAt: sql`now()`,
        approvedBy: actorPrincipalId ?? null,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hrmPayrollRuns.orgId, orgId),
          eq(hrmPayrollRuns.id, input.payrollRunId),
        ),
      );

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.PAYROLL_RUN_APPROVED,
      entityType: "hrm_payroll_run",
      entityId: input.payrollRunId,
      correlationId,
      details: {
        payrollRunId: input.payrollRunId,
        previousStatus: run.status,
        newStatus: "approved",
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.PAYROLL_RUN_APPROVED",
      version: "1",
      correlationId,
      payload: {
        payrollRunId: input.payrollRunId,
        status: "approved",
      },
    });

    return ok({
      payrollRunId: input.payrollRunId,
      status: "approved",
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to approve payroll run", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
