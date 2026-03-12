export interface AssignPositionInput {
  employmentId: string;
  positionId: string;
  effectiveFrom: string;
  changeReason?: string;
}

export interface AssignPositionOutput {
  previousWorkAssignmentId: string;
  newWorkAssignmentId: string;
}