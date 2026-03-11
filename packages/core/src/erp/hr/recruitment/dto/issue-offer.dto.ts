export interface IssueOfferInput {
  applicationId: string;
  offerNumber?: string;
  offeredOn?: string;
  offerExpiryDate?: string;
  offeredCompensation?: string;
  offerStatus?: string;
}

export interface IssueOfferOutput {
  offerId: string;
  offerNumber: string;
}