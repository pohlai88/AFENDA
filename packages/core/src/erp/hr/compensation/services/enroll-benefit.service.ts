import type { DbClient } from "@afenda/db";
import { auditLog, hrmBenefitEnrollments, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { EnrollBenefitInput, EnrollBenefitOutput } from "../dto/enroll-benefit.dto";

export async function enrollBenefit(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: EnrollBenefitInput,
): Promise<HrmResult<EnrollBenefitOutput>> {
  if (!input.employmentId || !input.benefitPlanId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "employmentId and benefitPlanId are required");
  }

  try {
    const data = await db.transaction(async (tx) => {
      // Guard: check for existing active enrollment
      const existing = await tx
        .select({ id: hrmBenefitEnrollments.id })
        .from(hrmBenefitEnrollments)
        .where(
          and(
            eq(hrmBenefitEnrollments.orgId, orgId),
            eq(hrmBenefitEnrollments.employmentId, input.employmentId),
            eq(hrmBenefitEnrollments.benefitPlanId, input.benefitPlanId),
            eq(hrmBenefitEnrollments.enrollmentStatus, "active"),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return err(
          HRM_ERROR_CODES.CONFLICT,
          "Employment is already actively enrolled in this benefit plan",
        );
      }

      const [row] = await tx
        .insert(hrmBenefitEnrollments)
        .values({
          orgId,
          employmentId: input.employmentId,
          benefitPlanId: input.benefitPlanId,
          enrollmentStatus: "active",
          enrolledAt: sql`now()`,
        })
        .returning({
          enrollmentId: hrmBenefitEnrollments.id,
          employmentId: hrmBenefitEnrollments.employmentId,
          benefitPlanId: hrmBenefitEnrollments.benefitPlanId,
          enrollmentStatus: hrmBenefitEnrollments.enrollmentStatus,
        });

      if (!row) throw new Error("Failed to enroll benefit");

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.BENEFIT_ENROLLED,
        entityType: "hrm_benefit_enrollment",
        entityId: row.enrollmentId,
        correlationId,
        details: {
          enrollmentId: row.enrollmentId,
          employmentId: row.employmentId,
          benefitPlanId: row.benefitPlanId,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.BENEFIT_ENROLLED",
        version: "1",
        correlationId,
        payload: {
          enrollmentId: row.enrollmentId,
          employmentId: row.employmentId,
          benefitPlanId: row.benefitPlanId,
        },
      });

      return ok<EnrollBenefitOutput>({
        enrollmentId: row.enrollmentId,
        employmentId: row.employmentId,
        benefitPlanId: row.benefitPlanId,
        enrollmentStatus: row.enrollmentStatus,
      });
    });

    return data;
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to enroll benefit", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
