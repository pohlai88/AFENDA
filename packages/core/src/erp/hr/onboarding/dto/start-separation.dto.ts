export interface StartSeparationItemInput {
  itemCode?: string;
  itemLabel: string;
  ownerEmployeeId?: string;
  mandatory?: boolean;
}

export interface StartSeparationInput {
  employmentId: string;
  separationType?: string;
  initiatedAt?: string;
  targetLastWorkingDate?: string;
  items?: StartSeparationItemInput[];
}

export interface StartSeparationOutput {
  separationCaseId: string;
  itemIds: string[];
}