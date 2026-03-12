export interface AcceptOfferInput {
  offerId: string;
  acceptedAt: string;
  autoStartOnboarding?: boolean;
  onboardingTemplateId?: string;
}

export interface AcceptOfferOutput {
  offerId: string;
  offerStatus: string;
  acceptedAt: string;
  onboardingPlanId?: string;
}