export interface RehireEmployeeInput {
  employeeId: string;
  legalEntityId: string;
  employmentType: "permanent" | "contract" | "temporary" | "internship" | "outsourced";
  hireDate: string;
  startDate: string;
  probationEndDate?: string;
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

  contract?: {
    contractNumber?: string;
    contractType: string;
    contractStartDate: string;
    contractEndDate?: string;
    documentFileId?: string;
  };
}

export interface RehireEmployeeOutput {
  employeeId: string;
  employmentId: string;
  workAssignmentId: string;
  contractId?: string;
}