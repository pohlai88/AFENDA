import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmPayrollPaymentBatches,
  hrmPayrollPaymentInstructions,
  hrmPayrollRunEmployees,
  hrmPayrollRuns,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface GeneratePaymentBatchInput {
  payrollRunId: string;
}

export interface GeneratePaymentBatchOutput {
  payrollRunId: string;
  paymentBatchId: string;
  batchNumber: string;
  instructionCount: number;
}

export async function generatePaymentBatch(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: GeneratePaymentBatchInput,
): Promise<HrmResult<GeneratePaymentBatchOutput>> {
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
      return err(HRM_ERROR_CODES.CONFLICT, "Payroll run must be approved before generating payment batch", {
        payrollRunId: input.payrollRunId,
        currentStatus: run.status,
      });
    }

    const [existing] = await db
      .select({ id: hrmPayrollPaymentBatches.id })
      .from(hrmPayrollPaymentBatches)
      .where(
        and(
          eq(hrmPayrollPaymentBatches.orgId, orgId),
          eq(hrmPayrollPaymentBatches.payrollRunId, input.payrollRunId),
        ),
      );

    if (existing) {
      return err(HRM_ERROR_CODES.PAYMENT_BATCH_ALREADY_EXISTS, "Payment batch already exists for this run", {
        payrollRunId: input.payrollRunId,
        paymentBatchId: existing.id,
      });
    }

    const runEmployees = await db
      .select({
        id: hrmPayrollRunEmployees.id,
        netAmount: hrmPayrollRunEmployees.netAmount,
        currencyCode: hrmPayrollRunEmployees.currencyCode,
      })
      .from(hrmPayrollRunEmployees)
      .where(
        and(
          eq(hrmPayrollRunEmployees.orgId, orgId),
          eq(hrmPayrollRunEmployees.payrollRunId, input.payrollRunId),
        ),
      );

    const batchNumber = `PAY-${run.runNumber}-${Date.now().toString(36).toUpperCase()}`;

    let totalMinor = 0;
    for (const re of runEmployees) {
      const net = parseFloat(String(re.netAmount ?? "0"));
      totalMinor += Math.round(net * 100);
    }
    const totalAmount = String(totalMinor / 100);

    const [batch] = await db
      .insert(hrmPayrollPaymentBatches)
      .values({
        orgId,
        payrollRunId: input.payrollRunId,
        batchNumber,
        totalAmount,
        currencyCode: runEmployees[0]?.currencyCode ?? "USD",
        status: "draft",
      })
      .returning({
        id: hrmPayrollPaymentBatches.id,
        batchNumber: hrmPayrollPaymentBatches.batchNumber,
      });

    if (!batch) {
      throw new Error("Failed to create payment batch");
    }

    for (const re of runEmployees) {
      await db.insert(hrmPayrollPaymentInstructions).values({
        orgId,
        paymentBatchId: batch.id,
        payrollRunEmployeeId: re.id,
        amount: re.netAmount ?? "0",
        currencyCode: re.currencyCode ?? "USD",
        status: "pending",
      });
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.PAYMENT_BATCH_GENERATED,
      entityType: "hrm_payroll_payment_batch",
      entityId: batch.id,
      correlationId,
      details: {
        payrollRunId: input.payrollRunId,
        paymentBatchId: batch.id,
        batchNumber: batch.batchNumber,
        instructionCount: runEmployees.length,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.PAYMENT_BATCH_GENERATED",
      version: "1",
      correlationId,
      payload: {
        payrollRunId: input.payrollRunId,
        paymentBatchId: batch.id,
        batchNumber: batch.batchNumber,
        instructionCount: runEmployees.length,
      },
    });

    return ok({
      payrollRunId: input.payrollRunId,
      paymentBatchId: batch.id,
      batchNumber: batch.batchNumber,
      instructionCount: runEmployees.length,
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to generate payment batch", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
