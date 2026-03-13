export interface CreateCompensationStructureInput {
  structureCode: string;
  structureName: string;
  payBasis: "annual" | "monthly" | "hourly" | "daily";
  currencyCode: string;
  minAmount: string;
  maxAmount?: string;
}

export interface CreateCompensationStructureOutput {
  compensationStructureId: string;
  structureCode: string;
  structureName: string;
  payBasis: string;
}
