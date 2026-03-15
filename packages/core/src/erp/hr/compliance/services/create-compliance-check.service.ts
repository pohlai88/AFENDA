import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmComplianceChecks,
  hrmEmploymentRecords,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateComplianceCheckInput {
  employmentId: string;
  checkType: string;
  checkDate: string;
  dueDate?: string | null;
  status?: string;
}

export interface CreateComplianceCheckOutput {
  complianceCheckId: string;
  status: string;
}

export async function createComplianceCheck(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateComplianceCheckInput,
): Promise<HrmResult<CreateComplianceCheckOutput>> {
  if (!input.employmentId || !input.checkType || !input.checkDate) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, checkType, and checkDate are required",
    );
  }

  try {
    const [employment] = await db
      .select({ id: hrmEmploymentRecords.id })
      .from(hrmEmploymentRecords)
      .where(
        and(
          eq(hrmEmploymentRecords.orgId, orgId),
          eq(hrmEmploymentRecords.id, input.employmentId),
        ),
      );

    if (!employment) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    const status = input.status ?? "pending";

    const [row] = await db
      .insert(hrmComplianceChecks)
      .values({
        orgId,
        employmentId: input.employmentId,
        checkType: input.checkType,
        checkDate: input.checkDate,
        dueDate: input.dueDate ?? null,
        status,
      })
      .returning({ id: hrmComplianceChecks.id, status: hrmComplianceChecks.status });

    if (!row) {
      throw new Error("Failed to create compliance check");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.COMPLIANCE_CHECK_CREATED,
      entityType: "hrm_compliance_check",
      entityId: row.id,
      correlationId,
      details: {
        complianceCheckId: row.id,
        employmentId: input.employmentId,
        checkType: input.checkType,
        status: row.status,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.COMPLIANCE_CHECK_CREATED",
      version: "1",
      correlationId,
      payload: {
        complianceCheckId: row.id,
        employmentId: input.employmentId,
        checkType: input.checkType,
      },
    });

    return ok({ complianceCheckId: row.id, status: row.status });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create compliance check", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
