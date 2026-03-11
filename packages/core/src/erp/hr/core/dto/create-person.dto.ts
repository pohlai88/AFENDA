export interface CreatePersonInput {
  personCode?: string;
  legalName: string;
  preferredName?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName?: string;
  birthDate?: string;
  genderCode?: string;
  maritalStatusCode?: string;
  nationalityCountryCode?: string;
  personalEmail?: string;
  mobilePhone?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePersonOutput {
  personId: string;
  personCode: string;
}