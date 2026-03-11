export interface ApproveRequisitionInput {
  requisitionId: string;
}

export interface ApproveRequisitionOutput {
  requisitionId: string;
  previousStatus: string;
  currentStatus: string;
}