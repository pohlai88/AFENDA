import type { DbClient } from "@afenda/db";
import { auditLog, hrmPayrollRuns, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface SubmitPayrollRunInput {
  payrollRunId: string;
}

export interface SubmitPayrollRunOutput {
  payrollRunId: string;
  status: string;
}

export async function submitPayrollRun(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: SubmitPayrollRunInput,
): Promise<HrmResult<SubmitPayrollRunOutput>> {
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

    if (run.status !== "draft") {
      return err(HRM_ERROR_CODES.CONFLICT, "Payroll run is not in draft status", {
        payrollRunId: input.payrollRunId,
        currentStatus: run.status,
      });
    }

    await db
      .update(hrmPayrollRuns)
      .set({
        status: "submitted",
        submittedAt: sql`now()`,
        submittedBy: actorPrincipalId ?? null,
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
      action: HRM_EVENTS.PAYROLL_RUN_SUBMITTED,
      entityType: "hrm_payroll_run",
      entityId: input.payrollRunId,
      correlationId,
      details: {
        payrollRunId: input.payrollRunId,
        previousStatus: run.status,
        newStatus: "submitted",
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.PAYROLL_RUN_SUBMITTED",
      version: "1",
      correlationId,
      payload: {
        payrollRunId: input.payrollRunId,
        status: "submitted",
      },
    });

    return ok({
      payrollRunId: input.payrollRunId,
      status: "submitted",
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to submit payroll run", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
