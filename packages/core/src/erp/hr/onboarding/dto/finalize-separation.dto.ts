export interface FinalizeSeparationInput {
  separationCaseId: string;
  closedAt?: string;
}

export interface FinalizeSeparationOutput {
  separationCaseId: string;
  previousStatus: string;
  currentStatus: string;
}