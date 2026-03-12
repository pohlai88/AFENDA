export interface ApproveRequisitionInput {
  requisitionId: string;
  comment?: string;
}

export interface ApproveRequisitionOutput {
  requisitionId: string;
  status: string;
  approvedAt: string;
}