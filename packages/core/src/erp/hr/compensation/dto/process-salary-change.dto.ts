export interface ProcessSalaryChangeInput {
  employmentId: string;
  newAmount: string;
  effectiveFrom: string;
  changeReason?: string;
}

export interface ProcessSalaryChangeOutput {
  historyId: string;
  employmentId: string;
  previousAmount: string | null;
  newAmount: string;
  effectiveFrom: string;
}
