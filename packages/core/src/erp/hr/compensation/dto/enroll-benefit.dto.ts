export interface EnrollBenefitInput {
  employmentId: string;
  benefitPlanId: string;
}

export interface EnrollBenefitOutput {
  enrollmentId: string;
  employmentId: string;
  benefitPlanId: string;
  enrollmentStatus: string;
}
