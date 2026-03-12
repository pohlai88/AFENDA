export interface RecalculateLeaveBalanceInput {
  employmentId: string;
  leaveTypeId: string;
  accrualPeriod: string;
  openingBalance?: string;
  accruedAmount?: string;
}

export interface RecalculateLeaveBalanceOutput {
  leaveBalanceId: string;
  employmentId: string;
  leaveTypeId: string;
  accrualPeriod: string;
  openingBalance: string;
  accruedAmount: string;
  consumedAmount: string;
  closingBalance: string;
}
