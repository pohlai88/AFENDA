import type { DbClient } from "@afenda/db";
import { auditLog, hrmBenefitPlans, outboxEvent } from "@afenda/db";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type {
  CreateBenefitPlanInput,
  CreateBenefitPlanOutput,
} from "../dto/create-benefit-plan.dto";

export async function createBenefitPlan(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateBenefitPlanInput,
): Promise<HrmResult<CreateBenefitPlanOutput>> {
  if (!input.planCode || !input.planName || !input.planType) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "planCode, planName and planType are required");
  }

  try {
    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmBenefitPlans)
        .values({
          orgId,
          planCode: input.planCode,
          planName: input.planName,
          planType: input.planType,
          providerName: input.providerName ?? null,
          isActive: true,
        })
        .returning({
          benefitPlanId: hrmBenefitPlans.id,
          planCode: hrmBenefitPlans.planCode,
          planName: hrmBenefitPlans.planName,
          planType: hrmBenefitPlans.planType,
        });

      if (!row) throw new Error("Failed to create benefit plan");

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.BENEFIT_PLAN_CREATED,
        entityType: "hrm_benefit_plan",
        entityId: row.benefitPlanId,
        correlationId,
        details: {
          benefitPlanId: row.benefitPlanId,
          planCode: row.planCode,
          planType: row.planType,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.BENEFIT_PLAN_CREATED",
        version: "1",
        correlationId,
        payload: {
          benefitPlanId: row.benefitPlanId,
          planCode: row.planCode,
          planType: row.planType,
        },
      });

      return ok<CreateBenefitPlanOutput>({
        benefitPlanId: row.benefitPlanId,
        planCode: row.planCode,
        planName: row.planName,
        planType: row.planType,
      });
    });

    return data;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown_error";
    if (msg.includes("hrm_benefit_plans_org_code_uq")) {
      return err(HRM_ERROR_CODES.CONFLICT, "A benefit plan with this code already exists");
    }
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create benefit plan", { cause: msg });
  }
}
