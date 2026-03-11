export interface HireEmployeeInput {
  personId: string;
  employeeCode?: string;
  workerType: "employee" | "contractor" | "intern" | "director";
  legalEntityId: string;
  employmentType:
    | "permanent"
    | "contract"
    | "temporary"
    | "internship"
    | "outsourced";
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
  contract?: {
    contractNumber?: string;
    contractType: string;
    contractStartDate: string;
    contractEndDate?: string;
    documentFileId?: string;
  };
  onboarding?: {
    templateId?: string;
    startDate?: string;
    autoGenerate?: boolean;
  };
}

export interface HireEmployeeOutput {
  employeeId: string;
  employmentId: string;
  workAssignmentId: string;
  contractId?: string;
  onboardingPlanId?: string;
}
