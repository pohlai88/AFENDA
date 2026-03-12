export interface TerminateEmploymentInput {
  employmentId: string;
  terminationDate: string;
  terminationReasonCode: string;
  comment?: string;
  startSeparationCase?: boolean;
}

export interface TerminateEmploymentOutput {
  employmentId: string;
  terminatedAt: string;
  separationCaseId?: string;
}