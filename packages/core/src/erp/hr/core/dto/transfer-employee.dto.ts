export interface TransferEmployeeInput {
  employmentId: string;
  effectiveFrom: string;
  legalEntityId: string;
  businessUnitId?: string;
  departmentId?: string;
  costCenterId?: string;
  locationId?: string;
  positionId?: string;
  jobId?: string;
  gradeId?: string;
  managerEmployeeId?: string;
  workScheduleId?: string;
  employmentClass?: string;
  fteRatio?: string;
  changeReason: string;
}

export interface TransferEmployeeOutput {
  previousWorkAssignmentId: string;
  newWorkAssignmentId: string;
}