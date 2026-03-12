export interface IssueOfferInput {
  applicationId: string;
  offerNumber?: string;
  offeredPositionId?: string;
  proposedStartDate?: string;
  baseSalaryAmount?: string;
  currencyCode?: string;
}

export interface IssueOfferOutput {
  offerId: string;
  offerNumber: string;
  offerStatus: string;
}