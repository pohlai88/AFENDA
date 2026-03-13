export interface AssignCompensationPackageInput {
  employmentId: string;
  compensationStructureId: string;
  salaryAmount: string;
  effectiveFrom: string;
  changeReason?: string;
}

export interface AssignCompensationPackageOutput {
  packageId: string;
  employmentId: string;
  compensationStructureId: string;
  salaryAmount: string;
  isCurrent: boolean;
}
