import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { auditLog, hrmJobGrades, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { CreateGradeInput, CreateGradeOutput } from "../dto/create-grade.dto";

function buildGradeCode(): string {
  return `GRD-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createGrade(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateGradeInput,
): Promise<HrmResult<CreateGradeOutput>> {
  if (!input.gradeName) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "gradeName is required");
  }

  const gradeCode = input.gradeCode ?? buildGradeCode();

  try {
    const existing = await db
      .select({ id: hrmJobGrades.id })
      .from(hrmJobGrades)
      .where(and(eq(hrmJobGrades.orgId, orgId), eq(hrmJobGrades.gradeCode, gradeCode)));

    if (existing[0]) {
      return err(HRM_ERROR_CODES.CONFLICT, "gradeCode already exists", { gradeCode });
    }

    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmJobGrades)
        .values({
          orgId,
          gradeCode,
          gradeName: input.gradeName,
          gradeRank: input.gradeRank,
          minSalaryAmount: input.minSalaryAmount,
          midSalaryAmount: input.midSalaryAmount,
          maxSalaryAmount: input.maxSalaryAmount,
        })
        .returning({ id: hrmJobGrades.id, gradeCode: hrmJobGrades.gradeCode });

      if (!row) {
        throw new Error("Failed to insert grade");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.GRADE_CREATED,
        entityType: "hrm_grade",
        entityId: row.id,
        correlationId,
        details: { gradeId: row.id, gradeCode: row.gradeCode },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.GRADE_CREATED",
        version: "1",
        correlationId,
        payload: { gradeId: row.id, gradeCode: row.gradeCode },
      });

      return { gradeId: row.id, gradeCode: row.gradeCode };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create grade", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}