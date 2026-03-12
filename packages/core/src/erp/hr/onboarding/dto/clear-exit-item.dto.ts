export interface ClearExitItemInput {
  exitClearanceItemId: string;
  clearedAt: string;
}

export interface ClearExitItemOutput {
  exitClearanceItemId: string;
  status: string;
  clearedAt: string;
}