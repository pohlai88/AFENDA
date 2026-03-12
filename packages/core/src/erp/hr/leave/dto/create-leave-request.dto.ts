export interface CreateLeaveRequestInput {
  employmentId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  requestedAmount: string;
  reason?: string;
}

export interface CreateLeaveRequestOutput {
  leaveRequestId: string;
  employmentId: string;
  leaveTypeId: string;
  status: string;
}
