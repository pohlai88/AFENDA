export interface CreateRequisitionInput {
  requisitionNumber?: string;
  requisitionTitle: string;
  legalEntityId: string;
  orgUnitId?: string;
  positionId?: string;
  hiringManagerEmployeeId?: string;
  requestedHeadcount?: string;
  requestedStartDate?: string;
}

export interface CreateRequisitionOutput {
  requisitionId: string;
  requisitionNumber: string;
}