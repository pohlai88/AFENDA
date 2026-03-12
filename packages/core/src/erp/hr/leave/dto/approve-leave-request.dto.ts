export interface ApproveLeaveRequestInput {
  leaveRequestId: string;
  approved: boolean;
  rejectionReason?: string;
}

export interface ApproveLeaveRequestOutput {
  leaveRequestId: string;
  status: "approved" | "rejected";
}
