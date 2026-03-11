export interface ClosePositionInput {
  positionId: string;
  effectiveTo: string;
}

export interface ClosePositionOutput {
  positionId: string;
  previousStatus: string;
  currentStatus: string;
}