export interface AcceptOfferInput {
  offerId: string;
  acceptedAt?: string;
}

export interface AcceptOfferOutput {
  offerId: string;
  previousStatus: string;
  currentStatus: string;
}