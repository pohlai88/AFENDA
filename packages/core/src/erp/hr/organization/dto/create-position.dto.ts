export interface CreatePositionInput {
  positionCode?: string;
  positionTitle: string;
  legalEntityId: string;
  orgUnitId?: string;
  jobId?: string;
  gradeId?: string;
  positionStatus?: string;
  isBudgeted?: boolean;
  headcountLimit?: number;
  effectiveFrom: string;
}

export interface CreatePositionOutput {
  positionId: string;
  positionCode: string;
}