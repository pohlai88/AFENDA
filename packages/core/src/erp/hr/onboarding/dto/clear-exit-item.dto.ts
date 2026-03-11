export interface ClearExitItemInput {
  itemId: string;
  clearedAt?: string;
}

export interface ClearExitItemOutput {
  itemId: string;
  previousStatus: string;
  currentStatus: string;
}