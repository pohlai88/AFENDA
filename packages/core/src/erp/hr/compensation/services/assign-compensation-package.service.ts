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
  AssignCompensationPackageInput,
  AssignCompensationPackageOutput,
} from "../dto/assign-compensation-package.dto";

export async function assignCompensationPackage(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: AssignCompensationPackageInput,
): Promise<HrmResult<AssignCompensationPackageOutput>> {
  if (
    !input.employmentId ||
    !input.compensationStructureId ||
    !input.salaryAmount ||
    !input.effectiveFrom
  ) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, compensationStructureId, salaryAmount and effectiveFrom are required",
    );
  }

  const salaryNum = parseFloat(input.salaryAmount);
  if (isNaN(salaryNum) || salaryNum <= 0) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "salaryAmount must be a positive number");
  }

  try {
    const data = await db.transaction(async (tx) => {
      // Close any existing current package for this employment
      const existing = await tx
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

      if (existing.length > 0) {
        await tx
          .update(hrmEmployeeCompensationPackages)
          .set({ isCurrent: false, effectiveTo: sql`now()` })
          .where(eq(hrmEmployeeCompensationPackages.id, existing[0]!.id));
      }

      const [row] = await tx
        .insert(hrmEmployeeCompensationPackages)
        .values({
          orgId,
          employmentId: input.employmentId,
          compensationStructureId: input.compensationStructureId,
          salaryAmount: input.salaryAmount,
          effectiveFrom: sql`${input.effectiveFrom}::timestamptz`,
          isCurrent: true,
          changeReason: input.changeReason ?? null,
        })
        .returning({
          packageId: hrmEmployeeCompensationPackages.id,
          employmentId: hrmEmployeeCompensationPackages.employmentId,
          compensationStructureId: hrmEmployeeCompensationPackages.compensationStructureId,
          salaryAmount: hrmEmployeeCompensationPackages.salaryAmount,
          isCurrent: hrmEmployeeCompensationPackages.isCurrent,
        });

      if (!row) throw new Error("Failed to assign compensation package");

      // Insert salary history
      await tx.insert(hrmSalaryChangeHistory).values({
        orgId,
        employmentId: input.employmentId,
        compensationStructureId: input.compensationStructureId,
        previousAmount: existing.length > 0 ? existing[0]!.salaryAmount : null,
        newAmount: input.salaryAmount,
        effectiveFrom: sql`${input.effectiveFrom}::timestamptz`,
        changeReason: input.changeReason ?? null,
        recordedBy: actorPrincipalId ?? null,
      });

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.COMPENSATION_PACKAGE_ASSIGNED,
        entityType: "hrm_employee_compensation_package",
        entityId: row.packageId,
        correlationId,
        details: {
          packageId: row.packageId,
          employmentId: row.employmentId,
          compensationStructureId: row.compensationStructureId,
          salaryAmount: row.salaryAmount,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.COMPENSATION_PACKAGE_ASSIGNED",
        version: "1",
        correlationId,
        payload: {
          packageId: row.packageId,
          employmentId: row.employmentId,
          compensationStructureId: row.compensationStructureId,
          salaryAmount: row.salaryAmount,
        },
      });

      return ok<AssignCompensationPackageOutput>({
        packageId: row.packageId,
        employmentId: row.employmentId,
        compensationStructureId: row.compensationStructureId,
        salaryAmount: row.salaryAmount,
        isCurrent: row.isCurrent,
      });
    });

    return data;
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to assign compensation package", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
