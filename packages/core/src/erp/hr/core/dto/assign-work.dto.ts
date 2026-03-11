export interface AssignWorkInput {
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
  changeReason?: string;
}

export interface AssignWorkOutput {
  previousWorkAssignmentId: string;
  newWorkAssignmentId: string;
}