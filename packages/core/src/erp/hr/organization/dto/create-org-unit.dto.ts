export interface CreateOrgUnitInput {
  legalEntityId: string;
  orgUnitCode?: string;
  orgUnitName: string;
  parentOrgUnitId?: string;
  status?: string;
}

export interface CreateOrgUnitOutput {
  orgUnitId: string;
  orgUnitCode: string;
}