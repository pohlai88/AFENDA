export interface PersonRecord {
  id: string;
  orgId: string;
  personCode: string;
  legalName: string;
  preferredName: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string | null;
  birthDate: string | null;
  genderCode: string | null;
  maritalStatusCode: string | null;
  nationalityCountryCode: string | null;
  personalEmail: string | null;
  mobilePhone: string | null;
  status: string;
}

export interface CreatePersonParams {
  orgId: string;
  actorUserId: string;
  personCode: string;
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

export interface PersonRepository {
  findById(args: {
    tx?: unknown;
    orgId: string;
    personId: string;
  }): Promise<PersonRecord | null>;

  findByPersonCode(args: {
    tx?: unknown;
    orgId: string;
    personCode: string;
  }): Promise<PersonRecord | null>;

  insert(args: {
    tx?: unknown;
    params: CreatePersonParams;
  }): Promise<PersonRecord>;
}