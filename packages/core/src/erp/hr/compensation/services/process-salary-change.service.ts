import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmployeeCompensationPackages,
  hrmSalaryChangeHistory,
  outboxEvent,
} from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type {
  ProcessSalaryChangeInput,
  ProcessSalaryChangeOutput,
} from "../dto/process-salary-change.dto";

export async function processSalaryChange(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: ProcessSalaryChangeInput,
): Promise<HrmResult<ProcessSalaryChangeOutput>> {
  if (!input.employmentId || !input.newAmount || !input.effectiveFrom) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, newAmount and effectiveFrom are required",
    );
  }

  const newAmountNum = parseFloat(input.newAmount);
  if (isNaN(newAmountNum) || newAmountNum <= 0) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "newAmount must be a positive number");
  }

  try {
    const data = await db.transaction(async (tx) => {
      // Find current active package
      const current = await tx
        .select({
          id: hrmEmployeeCompensationPackages.id,
          salaryAmount: hrmEmployeeCompensationPackages.salaryAmount,
          compensationStructureId: hrmEmployeeCompensationPackages.compensationStructureId,
        })
        .from(hrmEmployeeCompensationPackages)
        .where(
          and(
            eq(hrmEmployeeCompensationPackages.orgId, orgId),
            eq(hrmEmployeeCompensationPackages.employmentId, input.employmentId),
            eq(hrmEmployeeCompensationPackages.isCurrent, true),
          ),
        )
        .limit(1);

      if (current.length === 0) {
        return err(
          HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND,
          "No active compensation package found for this employment",
        );
      }

      const currentPkg = current[0]!;

      // Close current package
      await tx
        .update(hrmEmployeeCompensationPackages)
        .set({ isCurrent: false, effectiveTo: sql`now()` })
        .where(eq(hrmEmployeeCompensationPackages.id, currentPkg.id));

      // Insert new package with updated salary
      await tx.insert(hrmEmployeeCompensationPackages).values({
        orgId,
        employmentId: input.employmentId,
        compensationStructureId: currentPkg.compensationStructureId,
        salaryAmount: input.newAmount,
        effectiveFrom: sql`${input.effectiveFrom}::timestamptz`,
        isCurrent: true,
        changeReason: input.changeReason ?? null,
      });

      // Append to salary history
      const [histRow] = await tx
        .insert(hrmSalaryChangeHistory)
        .values({
          orgId,
          employmentId: input.employmentId,
          compensationStructureId: currentPkg.compensationStructureId,
          previousAmount: currentPkg.salaryAmount,
          newAmount: input.newAmount,
          effectiveFrom: sql`${input.effectiveFrom}::timestamptz`,
          changeReason: input.changeReason ?? null,
          recordedBy: actorPrincipalId ?? null,
        })
        .returning({
          historyId: hrmSalaryChangeHistory.id,
          employmentId: hrmSalaryChangeHistory.employmentId,
          previousAmount: hrmSalaryChangeHistory.previousAmount,
          newAmount: hrmSalaryChangeHistory.newAmount,
          effectiveFrom: hrmSalaryChangeHistory.effectiveFrom,
        });

      if (!histRow) throw new Error("Failed to record salary change history");

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.SALARY_CHANGE_PROCESSED,
        entityType: "hrm_salary_change_history",
        entityId: histRow.historyId,
        correlationId,
        details: {
          historyId: histRow.historyId,
          employmentId: histRow.employmentId,
          previousAmount: histRow.previousAmount,
          newAmount: histRow.newAmount,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.SALARY_CHANGE_PROCESSED",
        version: "1",
        correlationId,
        payload: {
          historyId: histRow.historyId,
          employmentId: histRow.employmentId,
          previousAmount: histRow.previousAmount,
          newAmount: histRow.newAmount,
        },
      });

      return ok<ProcessSalaryChangeOutput>({
        historyId: histRow.historyId,
        employmentId: histRow.employmentId,
        previousAmount: histRow.previousAmount,
        newAmount: histRow.newAmount,
        effectiveFrom: histRow.effectiveFrom.toISOString(),
      });
    });

    return data;
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to process salary change", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
