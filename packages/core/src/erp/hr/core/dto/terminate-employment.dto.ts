export interface TerminateEmploymentInput {
  employmentId: string;
  terminationDate: string;
  terminationReasonCode: string;
  comment?: string;
}

export interface TerminateEmploymentOutput {
  employmentId: string;
  previousStatus: string;
  currentStatus: string;
}