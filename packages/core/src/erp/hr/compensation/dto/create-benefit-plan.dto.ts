export interface CreateBenefitPlanInput {
  planCode: string;
  planName: string;
  planType: "health" | "dental" | "vision" | "life_insurance" | "retirement" | "other";
  providerName?: string;
}

export interface CreateBenefitPlanOutput {
  benefitPlanId: string;
  planCode: string;
  planName: string;
  planType: string;
}
