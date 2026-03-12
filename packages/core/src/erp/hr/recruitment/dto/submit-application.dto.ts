export interface SubmitApplicationInput {
  candidateId: string;
  requisitionId: string;
  applicationDate: string;
  stageCode?: string;
  ownerUserId?: string;
}

export interface SubmitApplicationOutput {
  applicationId: string;
  candidateId: string;
  requisitionId: string;
  stageCode: string;
}