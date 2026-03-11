export interface SubmitApplicationInput {
  candidateId: string;
  requisitionId: string;
  applicationStage?: string;
  appliedAt?: string;
}

export interface SubmitApplicationOutput {
  applicationId: string;
}